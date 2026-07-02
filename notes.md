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
