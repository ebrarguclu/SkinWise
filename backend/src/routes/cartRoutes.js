const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getCart, addToCart, updateCartItem, removeCartItem, mergeCart,
} = require('../controllers/cartController');

// Every cart endpoint needs a logged-in user. A guest's cart stays in the browser.
const router = express.Router();
router.get('/', requireAuth, getCart);                       // GET    /cart
router.post('/', requireAuth, addToCart);                    // POST   /cart        { productId, quantity }
router.post('/merge', requireAuth, mergeCart);               // POST   /cart/merge  { items } (after login)
router.patch('/:productId', requireAuth, updateCartItem);    // PATCH  /cart/3      { quantity }
router.delete('/:productId', requireAuth, removeCartItem);   // DELETE /cart/3

module.exports = router;
