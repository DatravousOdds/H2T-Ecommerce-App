# Notes

## 2026-07-02 — Notification bell: `permission-denied` on snapshot listener

**Symptom:** Console showed `FirebaseError: [code=permission-denied]: Missing or insufficient permissions` from a Firestore snapshot listener. Notification docs existed in Firestore (visible in console) but never rendered in the bell/badge UI.

**Root cause:** Firestore Security Rules had no `match` block for `notifications/{userId}/items/{itemId}` at all. Rules default-deny any path with no matching rule, so the client-side `onSnapshot` listener in [notifications.js](public/js/pages/notifications.js#L123-L145) was blocked outright.

The gap existed because notification docs are only ever *written* server-side via the Admin SDK (`createNotification()` in [server.js](server.js#L1119)), which bypasses Security Rules entirely — so writes always "worked" and the missing rule went unnoticed until the client tried to *read* them.

**Fix — added to Firestore rules**, alongside the existing `carts`/`favorites` blocks (same `{userId}/items/{itemId}` shape):

```
match /notifications/{userId}/items/{itemId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow update: if request.auth != null && request.auth.uid == userId
                && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);
}
```

**Why this shape, not `read, write` like carts/favorites:**
- `read`: owner-only, matches every other per-user subcollection in the ruleset.
- `update` (not `write`): client never creates or deletes notification docs — that's exclusively the server's job via Admin SDK. Granting `create`/`delete` would be unused surface area.
- Field-scoped update (`hasOnly(['read'])`): the only client write today is `markAllAsRead()` flipping `read: true`. Without the field restriction, a user could edit their own `title`/`message`/`link` client-side — no legitimate use case, and cheap to close since it costs no functionality.

**Known limitation, accepted for now:** even field-scoped, `read` is still a self-reported boolean the owning user can flip back to `false` at will. If this doc is ever used to back a support/dispute decision (e.g. "did the seller get notified of a sale"), a client-writable flag can't serve as that record — would need a server-side, append-only read-receipt instead. Not a concern today since nothing in the Orders/dispute flow reads this collection; revisit if that changes.

## 2026-07-02 — Cart page crash on unrelated pages: `Cannot set properties of null (setting 'innerHTML')`

**Symptom:** Console showed `Uncaught TypeError: Cannot set properties of null (setting 'innerHTML') at displayCartItems (cart.js:22:27) at cart.js:11:1` while on `authenticator/authenticate.html`, a page with no cart UI at all.

**Root cause:** [cart.js](public/js/commerce/cart.js#L11) runs `displayCartItems(bagItems)` as top-level module code, not inside a function gated on being on the cart page. ES modules execute their top-level code once on import — and [authenticate.js](public/js/services/authenticate.js#L5) imports `getUserCartCount`/`updateCartCount` from `cart.js` just to reuse those two helpers. That import alone was enough to trigger `displayCartItems`, which unconditionally does `document.getElementById('bagItemGrid').innerHTML = ""` — an element that only exists in `cart.html`'s markup, so on `authenticate.html` the lookup returns `null` and the assignment throws.

**Fix** — added a guard at the top of `displayCartItems`, mirroring the pattern already used by `renderCart()` in [cartDrawer.js](public/js/components/cartDrawer.js#L51-L53) for the same "element may not exist on this page" situation:

```js
function displayCartItems(items) {
    const bagItemGrid = document.getElementById('bagItemGrid');
    if (!bagItemGrid) return;
    bagItemGrid.innerHTML = "";
    ...
```

**Known limitation, accepted for now:** the guard stops the crash, but `cart.js`'s top-level code still runs `getCartItems(currentUser)` (a Firestore read) on every page that imports anything from the module, even when nothing on that page needs it. Harmless today since the only cross-page importer (`authenticate.js`) just wants two pure helper functions, but if more pages start importing from `cart.js` for unrelated reasons, this pattern would keep adding needless reads. The real fix would be splitting the cart-page-only side effects (`displayCartItems`/`initCartDrawer` calls) out of the module that exports the reusable helpers — not done here since it's a larger refactor beyond the reported bug.

## 2026-07-02 — Added "Pay Now" to the authentication request flow

**What changed:** Step 4 of the authentication request form ([authenticate.html](public/authenticator/authenticate.html#L518-L536)) used to have a single "Submit for Authentication" button that always added the request to the cart, to be paid for whenever the user checked out. Now there are two buttons: "Add to Cart" (the old behavior) and "Pay Now" (pays immediately and skips the cart).

**Why now, not just later:** terms2's checkbox copy on that same step already told the user *"the authentication process will begin once payment is confirmed"* — but the code didn't honor that. AI matching (`matchAuthenticationRequest`) fired immediately on submission regardless of payment, on every path. Adding Pay Now was the forcing function to actually fix that gap: matching now only fires from the Stripe webhook, after payment succeeds, on both paths.

**Files touched and what each is doing:**
- [global.js](public/js/core/global.js) — exported the previously-private `createAuthCartItem()` so both submission paths build the same cart-item shape instead of duplicating field mapping.
- [authenticate.js](public/js/services/authenticate.js#L853-L959) — split the old single `handleFormSubmission` into a shared `createAuthenticationRequest()` (upload images + create the Firestore doc, no matching trigger) plus `handleAddToCartSubmission()` (existing cart-add flow) and `handlePayNowSubmission()` (stashes the item in `sessionStorage` and redirects to `/checkout?authRequestId=...`, mirroring how `cart.js`'s per-item Checkout button hands off to `/checkout?listingId=...`). The old `triggerAuthMatching()` function is deleted — nothing calls it anymore.
- [cart.js](public/js/commerce/cart.js#L20-L115) — **found and fixed a live bug while tracing this**: the bag page's Checkout button only ever read `item.listingId`, but an authentication cart item has `authRequestId` instead. Clicking Checkout on an auth item in the cart was silently going to `/checkout?listingId=undefined`. Now branches on `item.itemType` for both the per-item template and the Checkout redirect.
- [checkout.js](public/js/commerce/checkout.js) — branches on `queryItem.itemType === 'authentication'`: skips the seller/shipping rendering (`hideShippingSection()`), shows a flat "Authentication Fee" line instead of the item/delivery/marketplace-fee/tax breakdown, and calls a new `getAuthOrderSummary()` instead of the listing-priced `getOrderSummary()`.
- [confirm.js](public/js/commerce/confirm.js) — branches the same way; the old success page queried an `orders` doc by payment intent id, which authentication payments never create. `displayAuthConfirmation()` renders straight from the `sessionStorage` item instead.
- [server.js](server.js) — three spots: `/order-summary` now branches on an `authRequestId` body param (owner-checked against `req.token.uid`, same pattern as the existing `/analyze` route) and returns a flat tier-cost total with no tax/delivery/marketplace-fee; `/create-checkout-session` tags Stripe metadata with `item_type: 'authentication'` + `auth_request_id` instead of `seller_id`/`listing_id`; the `payment_intent.succeeded` webhook has a new `handleAuthPaymentSucceeded()` branch (checked via that `item_type` tag) that marks the `authenticationRequests` doc `paid: true`, calls `matchAuthenticationRequest()` (the same function the admin "Run AI Match" fallback already uses — not duplicated), and sends a "Payment Confirmed" notification instead of creating an `orders` doc.

**Pricing decision:** authentication payments charge the flat tier cost only — no sales tax or marketplace fee. It's a service fee, not a marketplace sale between a buyer and seller, so the product-purchase fee model doesn't apply.

**Known limitation, not yet verified:** `hideShippingSection()` just sets `display: none` on the whole shipping block in `checkout.html`. Haven't checked this rendered in a browser — depends on `.shipping-payment`'s layout rules (flex/grid) whether the remaining "Payment Method" column ends up looking reasonably positioned with its sibling gone, or needs its own layout tweak.

## 2026-07-03 — Listing uploads keyed by email instead of uid, no Storage rule enforced ownership

**Found via:** code review of [seller.js](public/js/pages/seller.js#L996) while adding the draft-save feature, not a runtime bug report.

**Root cause:** `uploadImagesToFirebase()`/`uploadVideoToFirebase()` both take a `userId` param and build the Storage path as `listings/${userId}/${listingId}/...`, but all 4 call sites passed `currentUser.email` instead of `currentUser.userId` — while the Firestore listing doc, right in the same file, correctly used `currentUser.userId`. No Storage Security Rule enforced ownership on this path at all, so the mismatch never surfaced as a permission error; it would have, the moment a rule keyed on `request.auth.uid == userId` (the standard shape, same as the `notifications`/`carts`/`favorites` Firestore rules above) got added.

**Fix:**
1. Swapped `currentUser.email` → `currentUser.userId` at all 4 call sites (image + video upload, in both the post flow and the draft flow).
2. Added a Storage rule for `listings/{userId}/{listingId}/{fileName}`:
```
match /listings/{userId}/{listingId}/{fileName} {
  allow read: if true;
  allow write: if request.auth != null
               && request.auth.uid == userId
               && (
                 (request.resource.contentType in ['image/jpeg', 'image/png'] && request.resource.size < 5 * 1024 * 1024) ||
                 (request.resource.contentType in ['video/mp4', 'video/quicktime', 'video/webm'] && request.resource.size < 50 * 1024 * 1024)
               );
}
```
`read: if true` because these are public storefront photos/videos ([product.js](public/js/pages/product.js) renders them to any shopper, no auth gate) — the opposite of the owner-only notifications/carts/favorites rules, which guard private per-user data. `write` mirrors seller.js's own client-side whitelist (`ALLOWED_VIDEO_TYPES`, `MAX_VIDEO_SIZE`, the image type/size check in `handleImageUpload`) so the rule can't be bypassed by calling the Storage SDK directly instead of going through the UI.

**Known limitation, researched not fixed:** Security Rules only see request metadata (size, contentType, path) — never actual pixel data — so this can't enforce image resolution, aspect ratio, or reject low-quality/blurry photos. That needs either a pre-upload client-side check (spoofable, UX-only) or real server-side processing after upload (e.g. a Cloud Storage `onObjectFinalized` trigger decoding the file with something like `sharp` and deleting it if it fails). This app has no Cloud Functions deployed today — `firebase-admin` is only used from the existing Express server in [server.js](server.js) — so "real" quality enforcement would mean either standing up Cloud Functions for the first time, or routing seller image uploads through an Express endpoint instead of direct client-to-Storage writes. Not started; revisit if blurry/low-res listing photos become an actual seller-quality problem worth the infra lift.

## 2026-07-03 — Price History chart: same `permission-denied` shape, but couldn't use the same fix

**Symptom:** Console showed `FirebaseError: [code=permission-denied]: Missing or insufficient permissions` from [priceChart.js](public/js/components/priceChart.js#L106), same as the notification bell bug above. `orders` has no Firestore rule at all — default-deny again.

**Why this one couldn't just get an `allow read: if true` like `offers` did:** an `orders` doc carries `buyerId`, `sellerId`, `buyerEmail`, and `shippingAddress` ([server.js](server.js#L1274-L1286)). Rules grant/deny a whole document, not fields — so a public read rule on `orders` would let anyone with devtools pull every buyer's email and shipping address off the collection, not just the sale price the chart needs.

**Fix:** added `GET /api/products/:id/sales-history` in [server.js](server.js#L477-L510) — looks up the listing's `productName`/`brand` via the admin SDK, queries `orders` for matches, and hands back only `{ createdAt, subtotal }` per sale. [priceChart.js](public/js/components/priceChart.js) now calls this endpoint via `fetch()` instead of querying Firestore directly — no rule change needed for `orders`, it stays default-deny.

**Also fixed while in here:**
- The "1Y" filter button (`formatFilter()` in priceChart.js) was computing year-to-date (`Jan 1 -> today`) instead of a trailing 12 months — mislabeled behavior, not what "1Y" implies next to "1M"/"3M"/"6M".
- The stat-delta trend arrows in [product.html](public/shop/product.html#L242-L278) (4.2%, 1.5%, etc.) were hardcoded markup never touched by JS, unlike the stat-val numbers next to them. Added `toggleTrend()` in [product.js](public/js/pages/product.js) to hide a stat's trend arrow when that stat's underlying value is 0 (no data), instead of showing a fake percentage next to a placeholder.

**Found via verification, also fixed:** `offers` (queried by `getOfferKpis()` in product.js) has the exact same missing-rule problem as `orders` did, and blocked `displayPricingKpis()` before it ever reached the new `toggleTrend()` calls — so the stat cards stayed blank and the fake trend arrows stayed visible. Looked like one bug from the browser, but it's independent of the chart fix above.

First pass considered `allow read: if true` on `/offers/{offerId}`, reasoning that offer docs only hold `offerAmount`/`status`/`productId` — no PII like `orders`. Correctly pushed back on: `createOfferInFirebase()` (product.js:85) is commented out, so that field list isn't a real implementation, just what the current *read* queries touch. A future offer-creation flow will almost certainly need to record who made the offer (`buyerId`), and a standing `read: if true` rule would silently start exposing it the moment that field exists — same class of mistake the `orders` fix was specifically written to avoid.

**Fix:** added `GET /api/products/:id/offer-summary` in [server.js](server.js#L515-L534) — admin SDK, filters `offers` by `productId` only (status checked in memory, dodging a composite-index requirement), returns just `{ highest, lowest }`. `getOfferKpis()` in product.js now calls this instead of querying Firestore directly. `offers` stays default-deny, same as `orders` — no Firestore rule needed for either.

**Test data:** [scripts/seedSalesHistory.js](scripts/seedSalesHistory.js) writes N fake `orders` docs (tagged `isTestData: true`) for a given `listingId`, spread across the last 13 months with prices wobbling ±15% around the listing price, so every chart filter (1M/3M/6M/1Y/All) has something to render.

## 2026-07-03 — Started a "Post-MVP feature, disabled" convention (no design system exists yet)

**Context:** Trade and Sell To Us are both post-MVP per [CLAUDE.md](CLAUDE.md) but their buttons were still live on [product.html](public/shop/product.html#L94-L99) — Trade linked to a real `/trade` route, Sell To Us was hardcoded out with an HTML comment. Asked to disable both consistently; there was no written design system to check against, so this documents the pattern found by grepping the codebase, promoted into a shared rule, and is the seed of one.

**Existing precedent found (not invented here):** `nav.js` already disables Trade-in/Sell to Us in the nav using an `is-disabled` class + `aria-disabled="true"` + a `.coming-soon-badge` span, with a comment at [style2.css:1043](public/css/style2.css#L1043) explaining the intent: *"Post-MVP services stay visible so people know they're coming, but are inert — rendered without an href so clicks and keyboard activation are no-ops without needing extra JS."*

**Convention (now applied to product.html's cta-btns too):**
- Keep the element in the DOM and visible — don't delete or comment it out. Users should see the feature exists and is coming.
- Drop the `href` (or don't add one) so it's a real no-op, not a fake link. No extra JS needed to block clicks.
- Add `aria-disabled="true"` for screen readers.
- Add class `is-disabled`.
- Add `<span class="coming-soon-badge">Coming Soon</span>` inside the element.
- Style `is-disabled` as grey/muted with `cursor: not-allowed` and no hover animation.

**What's still ad hoc, to clean up after launch:** the CSS for this lives in two places styled independently — `.service-item.is-disabled`/`.submenu li a.is-disabled` in [style2.css](public/css/style2.css#L1046) for nav, and the new generic `.cta-btn.is-disabled` in [productDetails.css](public/css/pages/productDetails.css#L285-L301) for product-page buttons — because nav items and cta-btns don't share a base class. `.coming-soon-badge` itself is shared (defined once in style2.css, reused everywhere). Once more post-MVP surfaces need this treatment, worth promoting `is-disabled` + `.coming-soon-badge` into one documented component instead of re-deriving per stylesheet. No dedicated design-system doc exists yet — this note is the first write-up of the pattern; formalize into a proper STYLEGUIDE if it keeps recurring.

## 2026-07-03 — Authentication request submit: `productDetails.category` undefined after draft restore

**Symptom:** Firestore rejected the write with `FirebaseError: Function addDoc() called with invalid data. Unsupported field value: undefined (found in field productDetails.category in document authenticationRequests/...)`, thrown from [authenticate.js:1172](public/js/services/authenticate.js#L1172), on submit.

**Root cause:** `formData.productDetails` is only ever populated in one place — the `stepNumber === 2` branch of `validateStep()` ([authenticate.js:836](public/js/services/authenticate.js#L836)), which runs when the user clicks "Next" while physically on step 2. `restoreDraftState()` ([authenticate.js:535-580](public/js/services/authenticate.js#L535-L580)) restores `categorySelected` and refills the step-2 DOM inputs from the saved draft, but never re-derives `formData.productDetails` from them. Since uploaded images can't round-trip through `sessionStorage`, a restored draft always caps `currentStep` at 3 ([line 579](public/js/services/authenticate.js#L579)) — so after a refresh past step 2, the user lands on step 3, and going 3 → 4 never re-enters the step-2 branch. Result: the form *looks* filled in (DOM has the right values), but `formData.productDetails` is still its initial `{}` when `submitToFirebase()` reads `formData.productDetails.productCategory`.

**Fix:** in `restoreDraftState()`, after refilling the step-2 fields, rebuild `formData.productDetails` the same way `validateStep(2)` does:
```js
formData.productDetails = collectProductData(categorySelected);
```
Placed after the `forEach` that repopulates the DOM inputs (not before), since `collectProductData` reads live `element.value` off those same fields.

## 2026-07-03 — Authentication "Pay Now" redirected to `/login` for an already-logged-in user

**Symptom:** Clicking "Pay Now" on the final step sent a logged-in user to `/login`, intermittently — not on every attempt.

**Root cause:** a race in [firebase-client.js:52-58](public/js/api/firebase-client.js#L52-L58): `setPersistence(auth, browserLocalPersistence)` was fire-and-forget (`.then()/.catch()`, nothing awaited it). Meanwhile `checkUserStatus()` in [auth.js:75-126](public/js/auth/auth.js#L75-L126) attaches an `onAuthStateChanged` listener and unsubscribes after its *first* callback. If that first callback fired before `setPersistence` finished restoring the session from IndexedDB, it could fire with `user = null` — and since the listener never re-attaches, `cachedUser` locks in `false` for the rest of the page's life, even though the real session shows up moments later. This is invisible on most pages because nothing gates on `currentUser` early in the authenticate flow — `submitToFirebase()` ([authenticate.js:1121-1125](public/js/services/authenticate.js#L1121-L1125)) is the first and only place that checks it, right at the end.

**Fix:** made the persistence setup an awaited top-level statement instead of a dangling promise:
```js
try {
  await setPersistence(auth, browserLocalPersistence);
  console.log('Firebase persistence enabled');
} catch (error) {
  console.log('Failed to enable persistence', error);
}
```
Since `firebase-client.js` is an ES module, this top-level `await` blocks module evaluation for every importer — including `auth.js` — so `onAuthStateChanged` can no longer attach before persistence is configured.

**Verified:** confirmed fixed by the user after a hard refresh directly on the authenticate page post-login; Pay Now no longer bounces to `/login`.

## 2026-07-03 — Auth checkout: `PayloadTooLargeError` on `POST /create-checkout-session`

**Symptom:** Browser console showed a generic `Uncaught Error: Server Error` from [checkout.js:62](public/js/commerce/checkout.js#L62) (the frontend's own catch-all for any non-2xx response). The real error only surfaced server-side: `PayloadTooLargeError: request entity too large`, from `body-parser` inside `express.json()` ([server.js:119](server.js#L119)), which has no `limit` set and defaults to 100kb. Order Details also rendered a garbled, oversized-looking image instead of the expected product photo — the tell that something wasn't a normal URL.

**Root cause:** `submitToFirebase()` ([authenticate.js:1119-1183](public/js/services/authenticate.js#L1119-L1183)) correctly uploads auth-request proof photos to Firebase Storage via `uploadImagesToFirebase()` ([authenticate.js:1072-1101](public/js/services/authenticate.js#L1072-L1101)) and writes the real download URLs to the Firestore doc — but its success return was only `{ success: true, requestId }`, never exposing those uploaded URLs back to the caller.

`createAuthenticationRequest()` ([authenticate.js:864-886](public/js/services/authenticate.js#L864-L886)) then built the object handed off to checkout using `formData.images` instead — the *original* array from `collectImageData()` ([authenticate.js:698-714](public/js/services/authenticate.js#L698-L714)), which holds raw base64 `data:` URIs straight from `FileReader.readAsDataURL()`, never mutated with the real Storage URLs.

That base64 blob flowed: `authRequestData.images[0].url` → `createAuthCartItem()`'s `primaryImage` ([global.js:160](public/js/core/global.js#L160)) → `sessionStorage['item']` → `queryItem` in checkout.js → the `/create-checkout-session` POST body — easily over the 100kb body-parser limit for a photo.

**Fix:**
1. `submitToFirebase()` now returns the uploaded URLs too: `return { success: true, requestId: docRef.id, images: uploadedImages }`.
2. `createAuthenticationRequest()` now builds `authRequestData.images` from `result.images` instead of `formData.images`.

Both `handleAddToCartSubmission()` and `handlePayNowSubmission()` call `createAuthenticationRequest()`, so the fix covers both submission paths, not just Pay Now.

**Known limitation, not yet verified:** confirmed by code trace, not yet re-run through the browser end-to-end (upload photos → Pay Now → checkout renders real thumbnail → payment succeeds). Should verify before considering this closed.

## 2026-07-03 — Seller Orders tab: Pending Orders trend indicator was static markup, not computed

**Symptom:** Reported as "an error" on the Seller > Orders subtab — the Pending Orders card kept showing a fixed "-5 yesterday" trend regardless of actual data, standing out next to the other three stat cards which correctly showed "No data last month" for a seller with zero orders.

**Root cause:** not a bug in the sense of broken code — `updateTrends()` in [orders.js](public/js/pages/profile/selling/orders/orders.js#L197-L215) already computes real month-over-month trends for Total Orders, Total Revenue, and Average Order Value via `renderTrend()`, but Pending Orders was deliberately left out, still showing the original hardcoded `-5`/`down`/`yesterday` placeholder from the HTML. The reason (per the comment in place): pending orders are always 0 today, because `status` is set once at doc creation to Stripe's `"succeeded"` — no code path ever creates an order in any other state — so a real trend would always be a degenerate 0-vs-0 comparison.

**Fix:** wired Pending Orders into the same `renderTrend()` path as the other three cards instead of leaving it static:
```js
const thisMonthPending = thisMonthOrders.filter((o) => o.status !== "succeeded").length;
const lastMonthPending = lastMonthOrders.filter((o) => o.status !== "succeeded").length;
renderTrend("pending-orders", thisMonthPending, lastMonthPending);
```
Also updated the caption under that card in [profile.html](public/account/profile.html#L3502) from "yesterday" to "Compared to last month," since it's now a real calendar-month comparison like Total Orders, not a stale day-over-day label.

**Result today:** renders "No data last month" (grey, no arrow) — the same degenerate-case output the other cards already show for a 0-history seller — via `percentChange()`'s existing `null` branch, not a special case. No fake numbers, and it starts producing real percentages automatically the moment pending orders can actually exist (see the fulfillment-status gap noted in the "Price History chart" entry above and in `purchases.js`'s equivalent handling) — no further code change needed here when that lands.

## 2026-07-04 — Shipping/fulfillment status flow (pending → processing → shipped → delivered / cancelled)

**Context:** Implementing the shipping-flow spec (status enum, seller ship/deliver actions, cancel, notifications) for MVP launch. The spec assumed Cloud Functions + Firestore Security Rules gating orders; this app is an Express monolith where every order read/write already goes through `server.js` routes with manual auth checks, not client-side Firestore access — so the spec was adapted to that architecture rather than standing up Cloud Functions for the first time under deadline.

**New field, kept separate from the existing one on purpose:** `order.fulfillmentStatus` (`pending` → `processing` → `shipped` → `delivered`, or `cancelled` from pending/processing) is new. `order.status` is untouched — it stays Stripe's own payment status (`"succeeded"`, etc.), which [orders.js](public/js/pages/profile/selling/orders/orders.js) already depended on for its Paid/Unpaid badge. Chose `fulfillmentStatus` as the name instead of overloading `status` because [purchases.js](public/js/pages/profile/purchases/purchases.js) was *already* coded to read a `fulfillmentStatus` field that nothing had ever written yet — its own comments said as much (`"once a real fulfillment-status field exists... this starts producing real numbers with no further changes"`). Naming it to match meant the buyer-facing UI lit up with zero changes to that file's rendering logic.

**Found and fixed while wiring this — real bugs, not new work:**
- `GET/PUT/DELETE /orders/:id` in server.js all checked `order.items.some(item => item.sellerId === ...)`, assuming a multi-item order shape. Every real order (written by the webhook) is single-item — `order.sellerId`/`order.item`, no `items` array — so this threw a TypeError against every real order today. Fixed to `req.token.uid === order.sellerId` in all three routes ([server.js:598](server.js#L598), [:976](server.js#L976), [:1108](server.js#L1108)).
- [purchases.js](public/js/pages/profile/purchases/purchases.js)'s tracking-button display read `order.carrier`, but the field actually written (both in the old dead code and the new PUT route) is `shippingCarrier`. Fixed the read side.

**Order creation moved earlier, not just re-labeled:** orders used to only come into existence at the Stripe webhook (already paid). Now `checkout.js`'s [handleSubmit](public/js/commerce/checkout.js#L89) calls a new `POST /orders/init` ([server.js:447](server.js#L447)) right when the buyer clicks "Pay now" — writing `fulfillmentStatus: "pending"` and firing the buyer's "Order Confirmed" notification *before* payment captures. Deliberately not tied to checkout page load: the PaymentIntent itself is created on page load, and creating an order doc there too would leave a pending order behind for every abandoned/reloaded checkout. The webhook ([handlePaymentIntentSucceeded](server.js#L1691)) now finds that pending doc and updates it to `"processing"` instead of creating a fresh one (falls back to creating fresh only if `/orders/init` never fired, so a captured payment is never silently lost). Order-building logic extracted into [buildOrderDataFromPaymentIntent](server.js#L1676) so both call sites map Stripe metadata → order fields identically instead of duplicating it.

**Seller ship/deliver UI didn't exist at all — built new:** the seller Orders tab only had a "View Details" button with no click handler wired. Added a modal (`#seller-order-action-menu` in [profile.html](public/account/profile.html)) with a tracking-number/carrier form, Mark Shipped / Mark Delivered / Cancel buttons, wired in [orders.js](public/js/pages/profile/selling/orders/orders.js) via `wireOrderActions`/`openOrderActionMenu`/`refreshOrders` ([:390](public/js/pages/profile/selling/orders/orders.js#L390), [:333](public/js/pages/profile/selling/orders/orders.js#L333), [:304](public/js/pages/profile/selling/orders/orders.js#L304)). `fetchSellerOrders` had to start capturing `docSnap.id` too — it was discarding the Firestore doc id and keeping only `order.id` (the Stripe payment intent id), but `PUT/DELETE /orders/:id` key off the Firestore doc id.

**Buyer-side cancel added the same way, one message later:** `purchases.js` had the same "docId silently discarded" gap in `fetchBuyerOrders`. Added a Cancel Order button into the existing buyer order-details modal (conditional on `pending`/`processing`, matching what the backend actually allows), wired via `cancelOrder`/`refreshPurchases` ([:342](public/js/pages/profile/purchases/purchases.js#L342), [:359](public/js/pages/profile/purchases/purchases.js#L359)). Both `orders.js` and `purchases.js` now hold their fetched orders in a module-level `currentOrders` array instead of closures captured once at wire-time — needed once cancel/ship/deliver could mutate state out from under a stale closure.

**Server-side state machine, not just field writes:** `PUT /orders/:id` now checks `SELLER_FULFILLMENT_TRANSITIONS` (`shipped` only from `pending`/`processing`, `delivered` only from `shipped`) before writing, and requires a tracking number to mark shipped. `DELETE /orders/:id` only allows cancel from `pending`/`processing`, records `cancelledBy` (buyer/seller/admin), and takes an admin-only `reason` field included in the buyer's cancellation notification.

**Explicitly deferred, decided against implementing tonight:**
- **Email notifications** — `nodemailer` was imported in server.js but never configured anywhere (no transporter, no credentials, no `sendMail` call in the whole codebase). In-app notifications cover every transition; email is a real build-from-scratch task for whenever real SMTP/provider credentials exist.
- **>24h stale-in-processing seller reminder job** — the spec itself calls this a soft failure if skipped (`"orders just won't get seller nudges yet, which is a soft failure, not a launch blocker"`). Would need `node-cron` or similar; not installed.
- **Cloud Functions / Firestore Security Rules for orders** — not needed given this app's architecture (see Context above); orders access is fully gated in Express route handlers, not client-side Firestore reads/writes.

**Verified:** syntax-checked every touched file (`node -c`/`node --check`); did not run the live payment → ship → deliver flow through a browser end-to-end this session.

## 2026-07-04 — Home page: dark overlays added to both `#banner` and `#hero`

**What changed:** two separate hero-style sections on the home page got a dark image overlay, added in two passes after an initial mix-up between them.

**`#banner` (the mid-page "SELL · TRADE · EARN" promo, not the top hero):** its image side (`.banner-right-content`) already had an edge-blend gradient (`::before`) fading the solid black left panel into the photo, but nothing covering the whole image. Added a flat `rgba(0,0,0,0.25)` wash via `::after` (`::before` was already taken) — [style2.css:1346](public/css/style2.css#L1346).

**`#hero` (the actual top hero carousel, `.slider-container` → `.slide`) — this is the one meant by "hero," confirmed after initially overlaying the wrong section:** found that `#hero` itself already had a dark gradient baked into its own `background` property, but it's dead code — each `.slide` sets its own full-bleed `background-image` inline per slide (`hero_2/4/5.jpg`), which completely covers `#hero`'s background. None of the three actual slides had any overlay, so the white headline/CTA text sat directly on raw photos with zero guaranteed contrast. Added `rgba(0,0,0,0.35)` via `.slide::before` — [style2.css:845](public/css/style2.css#L845) — which paints correctly beneath `.hero-text` since pseudo-elements precede later DOM siblings at equal z-index.

**Verified:** screenshotted both sections via a headless Playwright script (project has no `chromium-cli`, adapted the fallback pattern using the `playwright` devDependency already in package.json) and confirmed via `getComputedStyle(el, "::before"/"::after")` that both overlays actually apply, not just exist in the stylesheet.

## 2026-07-04 — Product page `permission-denied` for logged-out visitors + a live PII leak found while diagnosing

**Symptom:** Console showed `FirebaseError: Missing or insufficient permissions` / `[code=permission-denied]` from [product.js:322](public/js/pages/product.js#L322) (`displayProductDetails`) and [product.js:171](public/js/pages/product.js#L171) (`createCartItem`) — but only for logged-out visitors. Logged-in users viewing the same product page saw no error.

**Root cause:** the deployed Firestore rule for `userProfiles` was `allow read: if request.auth != null;` — any login, no ownership check. [product.js](public/js/pages/product.js) reads a seller's `userProfiles` doc directly from the client (via `getUserProfile()` in [global.js](public/js/core/global.js)) to show username/photo/verified badge/rating on a public product page — a read that has to work for anonymous shoppers, which `request.auth != null` blocks outright.

**Bigger issue found in the same rule while diagnosing, not what triggered the visible error:** `if request.auth != null` with no `&& request.auth.uid == userId` check meant *any logged-in user* could already read *any other user's* full `userProfiles` document — including `stripeCustomerId` and `shipping` (home address + phone), both stored on that doc per `PUT /userProfiles/:id`. A live PII leak, just a silent one (no thrown error) rather than the loud one that got noticed.

**Why the fix isn't "loosen the rule to `if true`":** that would extend the leak to anonymous users too. Firestore rules grant/deny a whole document, not individual fields — same constraint already documented in the two "Price History chart" / `orders`/`offers` entries above. Followed that established pattern:
- Added `GET /api/sellers/:id/public-profile` in [server.js:538](server.js#L538) — Admin SDK, returns only `username`/`profileImage`/`isVerified`/`ratings`/`stats`.
- `getUserProfile()` in [global.js:194](public/js/core/global.js#L194) now calls that endpoint via `fetch()` instead of reading `userProfiles` directly. (Not touched: `fetchUserProfile()` in `auth.js`, which reads a user's *own* full profile after login — a different function, correctly scoped to self already.)
- Tightened the rule to `allow read: if request.auth != null && request.auth.uid == userId;` — closes the cross-user leak, no longer needs to be public since anonymous reads now go through the endpoint instead.

**Deploy order mattered here:** code and rule had to land together, not rule-first — tightening the rule before the new client code shipped would have temporarily made things *worse* (logged-in users viewing someone else's product page would *also* start getting permission-denied, on top of logged-out visitors already getting it).

**Verified:** confirmed both were live in production, then drove a fresh (no stored auth) Playwright browser session through the actual home page → click a real product card → product detail page, and confirmed zero console errors plus the seller name/photo (`newSeller420`) rendering correctly from the new endpoint.

## 2026-07-04 — Login page: mobile layout not scaling + email input showing capitalized

**Symptom 1:** On mobile, the login page "doesn't take up the viewport" and looks the same as desktop, just shrunk.

**Root cause:** [login.html](public/auth/login.html) had no `<meta name="viewport">` tag at all — checked every page under `public/auth/` (`login`, `signup`, `forgot`, `mail`, `email-sent`) and none of them have one, though `index.html` does. Without it, mobile browsers render at a virtual desktop-width viewport (~980px) and zoom the whole page out to fit, rather than rendering at the device's actual width. This silently broke an already-written `@media (max-width: 480px)` block in [Loginpg.css](public/css/Loginpg.css#L235-L257) — with no viewport meta, a phone's reported virtual width never drops below 480px, so that block was dead code, not a missing feature.

**Fix:** added `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` to login.html's `<head>`. Only touched the reported page — the same gap exists on `signup.html`/`forgot.html`/`mail.html`/`email-sent.html`, worth the same fix if those are ever reported too.

**Symptom 2:** Typing `test3@example.com` into the email field displayed as `Test3@example.com`.

**Root cause:** display-only CSS, not an input transform — `text-transform: capitalize` on a broad `input:not(.search-box, .checkbox, .s-checkbox, input[type="file"])` selector, duplicated in both [Loginpg.css](public/css/Loginpg.css#L58) and [signup.css](public/css/signup.css#L42) (both load on this page; `signup.css` loads second so its identical rule is what actually wins the cascade). Neither exclusion list carved out email fields.

**Fix:** added `input[type="email"]` to the `:not(...)` exclusion list in both stylesheets. Confirmed both `login.html` and `signup.html`'s email inputs use `type="email"` (not just `id="email"`), so the fix covers signup's email field too without touching it directly.

**Verified:** Playwright — typed the reported string into `#email` on desktop and confirmed `getComputedStyle().textTransform === "none"` and the input's actual value renders lowercase; loaded the page in a 390×844 (iPhone-sized) mobile context and confirmed `window.innerWidth` matches the real device width (not a scaled-down desktop layout) and the email input's rendered width matches the `85vw` mobile rule exactly (331.5px @ 390px viewport), proving the previously-dead media query now fires.

## 2026-07-04 — Skeleton loading for profile header (background / avatar / follower & following counts)

**What changed:** `loadProfileDisplayData()` in [profile.js](public/js/pages/profile/profile.js#L44) populates these four pieces only after `checkUserStatus()` resolves; until then they used to just show whatever static placeholder content was baked into [profile.html](public/account/profile.html) (`@sara.almasi`'s `12.3k`/`20k` stats, a blank background, the default-avatar image) with no loading indication at all. Added shimmer skeletons for exactly those four, reusing the `.skeleton` shimmer primitive from [skeleton.css](public/css/components/skeleton.css) already established by the Purchases/Orders tabs — not the spinner-dots `showLoader()`/`hideLoader()` pattern used elsewhere ([pageLoader.js](public/js/components/pageLoader.js)), since the ask was specifically "skeleton loading."

**Scope, deliberately narrow:** username, join-date, verified badge, rating, and bio are untouched — still show immediately (or their existing hide-if-empty behavior). Only background/avatar/followers/following got skeletons, matching exactly what was asked rather than extending the treatment to the whole `#pfp-data` header.

**Shape of the fix, one pattern per element:**
- `.profile-background` — no separate sibling needed since it's just an empty div with `background-image` set via JS; toggles the `.skeleton` class directly on itself, added in the HTML by default and removed in `loadProfileDisplayData()` (unconditionally, even if `userData.backgroundImage` is falsy — "no background set" is a real end state, not still-loading, so the shimmer has to stop either way).
- Avatar (`#profile-picture`) and both stat values (`#followers-count`/`#following-count`) — each got a sibling `.skeleton`-classed placeholder (`.avatar-skeleton`, `.stat-skeleton`) sized/positioned to match the real element exactly, so swapping causes no layout jump. The real elements ship with `class="hidden"` baked into the HTML (not added via JS after first paint), so there's no flash of the old fake `@sara.almasi`/`12.3k` placeholder content at all — an improvement over the existing `#profile-data`/`#shipping-data` `.is-loading` convention this was otherwise modeled on, which does still flash real (fake) content briefly before JS adds its loading class.

**Bug found and fixed while verifying, not assumed away:** `.avatar-skeleton { border-radius: 50%; }` rendered as a square, not a circle. `skeleton.css`'s `.skeleton { border-radius: 4px; }` loads *after* `profile.css` in every page's `<head>`, so at equal selector specificity (0,1,0 each) it wins regardless of which class comes first in the element's `class` attribute. Caught via `getComputedStyle` in a Playwright check, not by eyeballing the screenshot — the rectangle was subtle enough at 100×100px to almost miss visually. Fixed by upping specificity with a combined selector (`.avatar-skeleton.skeleton { border-radius: 50%; }`), and applied the same fix preemptively to `.profile-background.skeleton`'s corner radius (8px top corners vs the shared class's flat 4px), same root cause, before it could cause the identical bug.

**Verified:** Playwright against a logged-out session (which never calls `loadProfileDisplayData()`, so the skeleton state stays visible indefinitely — useful for screenshotting the loading state on demand): confirmed via computed styles that all four real elements are hidden and all four skeletons are visible/shimmering with the corrected sizing, then screenshotted to confirm the circle avatar and pill-shaped stat placeholders line up exactly where the real content renders.

## 2026-07-04 — Order confirmation page: same `orders` `permission-denied` shape, on a listener this time

**Symptom:** Console showed `FirebaseError: [code=permission-denied]: Missing or insufficient permissions` from an `onSnapshot` listener, right after Stripe redirected back to the confirmation page. The order confirmation UI never rendered for a real (non-authentication) purchase.

**Root cause:** same pre-existing gap as the "Price History chart" entry above — `orders` has no Firestore rule at all (default-deny), because a rule would have to grant/deny the *whole* document, and `orders` docs carry `buyerId`/`sellerId`/`buyerEmail`/`shippingAddress`. [confirm.js](public/js/commerce/confirm.js) queried `orders` directly from the client with `onSnapshot(query(collection(db,"orders"), where("id","==",paymentIntent)), ...)` — every real order hit this, it just hadn't been reported yet.

**Why `onSnapshot` instead of a one-time read in the first place, and why that's no longer needed:** the listener pattern made sense back when the `orders` doc only came into existence from the Stripe webhook, sometime after redirect — a listener could catch it appearing. That's no longer true: per the "Shipping/fulfillment status flow" entry above, `checkout.js`'s `/orders/init` call ([server.js:447](server.js#L447)) now creates the order doc synchronously the moment the buyer clicks "Pay now," before Stripe even runs the payment. By the time the confirmation redirect happens, the doc already exists — so a single fetch is enough, no need to wait/listen.

**Fix**, same pattern as `/api/products/:id/sales-history` and `/api/sellers/:id/public-profile` above:
- Added `GET /api/orders/by-payment-intent/:paymentIntentId` in [server.js:888](server.js#L888) — `verifyAuth` + the same `buyerId`/`sellerId` ownership check already used by `GET /orders/:id` ([server.js:821](server.js#L821)), just looked up by the Stripe payment intent id (stored as the order doc's own `id` field) instead of the Firestore doc id, since that's all the confirmation page's redirect URL has.
- `confirm.js` now calls that endpoint via `fetch()` with `Authorization: Bearer ${user.idToken}` instead of the client-side `onSnapshot` listener. Dropped the now-unused `collection`/`query`/`where`/`onSnapshot`/`db` imports.

**Not done:** did not add an `orders` Firestore rule — same reasoning as the Price History chart entry, still applies.

## 2026-07-04 — Checkout redirected to `/login` for an already-logged-in user

**Symptom:** Add an item to the cart, go to the bag page ([cart.js](public/js/commerce/cart.js)), click "Checkout" — bounced straight to `/login` even though the user was already logged in (confirmed logged in on every other page, including the cart page itself right before clicking).

**Root cause:** [checkout.js](public/js/commerce/checkout.js#L10) gated the whole page on `JSON.parse(sessionStorage.getItem('user'))`, a completely different (and stale) signal from `checkUserStatus()` — the single source of truth every other protected flow uses (`cart.js`, `confirm.js`, `product.js`, etc.). That `sessionStorage['user']` key is only ever written in two places in [auth.js](public/js/auth/auth.js#L322,L386): the signup success handler and the login form's submit handler — i.e. only at the exact moment a user types their credentials into the login/signup form in the *current tab*. It is never written on page load, and never re-derived from Firebase's own persisted session.

So the moment a user is logged in via a persisted session instead of having just typed their password in this tab — closed and reopened the browser, opened a new tab, or simply had `browserLocalPersistence` restore their session on load — `sessionStorage['user']` is empty for that tab even though `checkUserStatus()` correctly resolves them as logged in from the real (IndexedDB-backed) Firebase auth state. `checkout.js` checked the wrong flag before ever calling `checkUserStatus()`, so it bounced a genuinely logged-in user to `/login`.

**Fix:** dropped the `sessionStorage['user']` gate entirely. `checkout.js` now calls `checkUserStatus()` first and gates on its return value directly, same as every other page:
```js
let currentUser = await checkUserStatus();

if (!currentUser) {
    window.location.href = '/login';
} else {
    ...
}
```
The rest of the file already used `currentUser` (from `checkUserStatus()`) for everything past the gate (`currentUser.userId`, `.email`, `.idToken`) — the stale `user` variable was only ever read at the gate itself, nowhere else, so no other call site needed to change.

**Not touched:** the `sessionStorage.setItem("user", ...)` writes in `auth.js`'s login/signup handlers and the parallel `localStorage.setItem("user", ...)` write — grepped for other readers of `sessionStorage['user']` and found none, so nothing else depends on it today. Worth a later cleanup pass to remove the now-fully-unused writes, but left alone since deleting dead writes wasn't needed to fix this bug.

## 2026-07-04 — Profile Personal/Shipping Info: `TypeError: null is not an object (evaluating 'inputElement.classList')` on Save

**Symptom:** Clicking Save on either the Personal Information or Shipping Information tab on the Profile page did nothing — no save, no visible error to the user. DevTools showed `TypeError: null is not an object (evaluating 'inputElement.classList')` thrown from `clearError()` in [global.js:391](public/js/core/global.js#L391), called from `validateForm()` at [global.js:452](public/js/core/global.js#L452), called from [profile-info.js:223](public/js/pages/profile/profile-info.js#L223) (the Save button's click handler) and separately from [profile-info.js:107-109](public/js/pages/profile/profile-info.js#L107-L109) (the form's native `submit` handler — both fire on the same click since Save is a `type="submit"` button inside a `<form>`).

**Root cause:** `validateForm()` in `global.js` looked up the email field with `formElement.querySelector("[name='email']")` in four places (reading the value, clearing a prior error, and setting a new error twice). But the actual input in [profile.html:342](public/account/profile.html#L342) is `name="personal-email"`, not `name="email"` — there is no element anywhere in either form with `name="email"`. The "clear previous errors" block runs unconditionally whenever an `#emailError` span exists in the form (it does, at [profile.html:348](public/account/profile.html#L348)), so `clearError(null, emailError)` ran on every single validation pass — on both forms, on every Save click and every submit — and crashed immediately, before any of the actual field validation or the Firestore update call ever ran.

This selector mismatch, not a Firestore/permissions issue, is why *nothing* saved: the crash happened synchronously inside `validateForm()`, before `updateProfile()`/`updateShippingInfo()` in [profile-info.js](public/js/pages/profile/profile-info.js) were ever reached.

**Fix:** changed all four `[name='email']` selectors in `global.js`'s `validateForm()` to `[name='personal-email']` (lines 420, 456, 499, 505), matching the real input name. Confirmed no other caller of this shared `validateForm()` relies on a `name="email"` field — `authenticate.js` defines its own separate local `validateForm()` and isn't affected; `login.html`/`signup.html` don't call this function at all.

**Verified:** loaded `/profile` in a headless Playwright session and dispatched a `submit` event directly on `#personalInformation` (bypassing the login requirement, since this only needed to exercise `validateForm()`, not the Firestore write). Before the fix: `inputElement.classList` TypeError, matching the reported screenshot exactly. After the fix: no such error — the only remaining console errors were `Cannot read properties of null (reading 'userId')` from `checkUserStatus()`, expected in a session with no real logged-in user, and unrelated to the reported bug.

**Known issue, found but not fixed (out of scope of this bug):** [profile.html](public/account/profile.html) has two separate inputs both named `name="shipping-address"` — the real "Address" field ([:498](public/account/profile.html#L498)) and "Address 2" ([:510](public/account/profile.html#L510)). `formElement.querySelector("[name='shipping-address']")` always resolves to the first one, so Address 2 is never reached by `validateForm()`'s validation/error-clearing logic (it does have its own error span, `#addressTwoError`, that nothing currently targets). Didn't fix since it doesn't crash anything today and wasn't the reported symptom — flagging here since it's the same class of bug (selector/name mismatch) and would bite the next person who wires up Address 2 validation.

## 2026-07-04 — Seller listing form: entered price saved as `$0.00` listing price, showed up as retail price instead

**Symptom:** After listing an item on [seller.html](public/seller/seller.html), the price the seller typed in showed up as the retail/strikethrough price on the product page, while the actual listing price (what a buyer pays) showed `$0.00`.

**Root cause:** `collectListingInfo()` in [seller.js](public/js/pages/seller.js) only ever wrote the form's price input into `listing.originalPrice`, never into `listing.listingPrice`. `listing.listingPrice` is initialized to `0` at module load ([seller.js:99](public/js/pages/seller.js#L99)) and nothing else in the file ever set it, so it saved to Firestore unchanged. Every display path (`global.js`, `product.js`, `men.js`, `cart.js`, `cartDrawer.js`) reads `listingPrice` as the buyer-facing price and shows `originalPrice` struck through only when it's higher — so the two fields being swapped inverted the display exactly as reported.

**Underlying design gap:** the form only has one price input ([seller.html:220](public/seller/seller.html#L220)), but the data model has two distinct fields (`listingPrice` = current price, `originalPrice` = prior/retail price shown struck through). Confirmed with the user the intended behavior: `originalPrice` should only get populated as a price-drop marker — when editing an existing listing and the seller changes the price, the *previous* price becomes `originalPrice` and the new one becomes `listingPrice`. A brand-new listing has no prior price, so no strikethrough.

**Fix:**
- Added module-level `previousListingPrice`, set from `existing.listingPrice` in `loadListingForEdit()` ([seller.js:453](public/js/pages/seller.js#L453)) when opening a listing for edit.
- `populateFormForEdit()` ([seller.js:476](public/js/pages/seller.js#L476)) now pre-fills the price input from `existing.listingPrice` (the live price) instead of `existing.originalPrice`.
- `collectListingInfo()` now always sets `listing.listingPrice` from the input. It only sets `listing.originalPrice` when editing *and* the entered price differs from `previousListingPrice` — the previous price becomes the strikethrough value. When the price is unchanged, `originalPrice` is left unset entirely (not overwritten) so `updateDoc` doesn't clobber any markdown already saved on the listing from an earlier price drop.
- `showSuccessMessage()`'s post-listing confirmation modal ([seller.js:718](public/js/pages/seller.js#L718)) was also reading `listing.originalPrice` for its price display — only "worked" before because of the same bug. Switched to `listing.listingPrice`.

**Not done:** no handling for what happens if `originalPrice` should ever reset (e.g., price rises back above a prior markdown) — every price change while editing currently sets `originalPrice` to whatever the price used to be, even if that means a "was $40, now $60" strikethrough on a price increase. Not addressed since it wasn't part of the reported bug; worth a follow-up decision if increases should behave differently from drops.

**Verified:** `node --check` on the touched file; did not run the live create/edit-listing flow through a browser this session.
