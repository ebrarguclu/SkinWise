const express = require('express');
const { getAllProducts, getProductById } = require('../controllers/productController');

const { requireAuth } = require('../middleware/auth');
const { createReview } = require('../controllers/reviewController');

const router = express.Router();
router.get('/', getAllProducts);   // GET /products -> getAllProducts çalışır
router.get('/:id', getProductById); // GET /products/3 -> tek ürün
router.post('/:id/reviews', requireAuth, createReview); // POST /products/3/reviews

module.exports = router;
