# Cart test cases (Jira DP-14, Sprint 3 bug fixes)

Owner: Fethiye Ebrar Güçlü · Branch: `ebrar/fix/cart-ux`

## Kinds of tests

| Kind | What it checks | File | How to run | Count |
|---|---|---|---|---|
| Unit tests | Stock and toast rules as pure functions | `frontend/src/lib/cartStock.test.js` | `cd frontend && npm test` | 24 |
| Component tests | The real Cart page and ProductCard drawn in a fake browser (jsdom) | `frontend/src/pages/Cart.test.jsx` | `cd frontend && npm test` | 11 |
| API integration tests | Real HTTP requests to the Express app: routes, `requireAuth`, controller, RLS-like database | `backend/tests/cartApi.integration.test.js` | `cd backend && npm test` | 9 |
| Use case tests (manual / end to end) | The flows below, clicked through in the browser | this file | by hand, see the steps | 6 |

## Bugs found and fixed

| Bug | What happened | Fix |
|---|---|---|
| BUG-1 | When the whole stock was already in the cart, "Add to cart" could still be clicked and every click showed a new red error. | The button turns off and says "✓ All 3 in your cart" (product list and product page). |
| BUG-2 | Toasts piled up (5 clicks = 5 boxes) and covered the buttons of the product cards. | The same message replaces the old one, at most 3 toasts are shown, and toasts no longer block clicks. |
| BUG-3 | On a phone, cart lines broke: the product name wrapped word by word and the remove button fell onto its own line. On a computer the quantity buttons were not lined up. | Cart lines use fixed columns on a computer and a two-row layout on a phone. |
| BUG-4 | Reaching the stock limit in the cart was shown only as faint grey text. | A green note says "You have all 3 in stock", and + is turned off. |
| BUG-5 | The cart did not notice when stock dropped after a product was added: the guest cart kept the old price and stock, and checkout was possible with products that were sold out. | The cart page loads the current price and stock and fixes the cart by itself: quantities go down to the stock left, sold-out products are removed, and one notice says what changed. (Only if that cannot be saved do the lines stay marked in red with checkout off.) |
| BUG-6 | After a page refresh a logged-in customer's cart page first acted as a guest cart, because the login was still being checked. | The cart is "ready" only after the login check has finished. |

## Use cases

Use the test data that is set up before each case: a product with stock 3 (for example a serum), a product with stock 1, and one customer account.

### UC-1: A guest adds more than the stock (BUG-1, BUG-2)
1. Without logging in, open Shop.
2. Click "Add to cart" on the product with stock 3 three times.

Expected:
- Each click shows one green toast; the toasts replace each other instead of stacking up.
- After the third click the button says "✓ All 3 in your cart" and cannot be clicked.

Result: **Pass**

### UC-2: The product page shows the same state (BUG-1)
1. Open the same product's page.

Expected: The button says "✓ All 3 in your cart" and is turned off, with a "Go to your cart" link.

Result: **Pass**

### UC-3: Stock drops after the product was added (BUG-5, BUG-6)
1. Add 4 of a product to the cart (as a guest, or logged in).
2. In Supabase, lower that product's stock to 1, and set another cart product's stock to 0.
3. Open My Cart (also after a page refresh).

Expected:
- The quantity is now 1 by itself (for a logged-in customer also in `cart_items`).
- The sold-out product is removed.
- A blue notice says: "Stock changed since you added these products. … only 1 left, so your quantity is now 1. … is sold out and was removed."
- Checkout stays on.
- The notice can be closed and is gone on the next visit.

Afterwards: set the stock back in Supabase.

Result: **Pass**

### UC-4: A guest goes to checkout (requirement 4)
1. As a guest with products in the cart, click "Proceed to checkout".
2. Log in.

Expected:
- Clicking "Proceed to checkout" opens the login page with a note.
- After logging in, the customer comes back to checkout.
- My Cart still has the guest products.

Result: **Pass**

### UC-5: A logged-in customer adds more than the stock (BUG-1, BUG-4)
1. Log in.
2. Click "Add to cart" on a product with stock 7 until it stops.
3. Open My Cart.

Expected:
- The button stops at 7 and says "✓ All 7 in your cart".
- The cart line shows "You have all 7 in stock".
- The + button is turned off.

Result: **Pass**

### UC-6: The cart on a phone (BUG-3)
1. Open My Cart at phone width (375 px, or use the browser's device toolbar).

Expected: Each line shows:
- the photo;
- the name, with the remove button beside it;
- the quantity buttons and the line total on one row under the name.

Nothing overlaps.

Result: **Pass**
