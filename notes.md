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
