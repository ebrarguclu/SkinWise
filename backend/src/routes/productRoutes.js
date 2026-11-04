const express = require('express');
const { getAllProducts, getProductById } = require('../controllers/productController');

const router = express.Router();
router.get('/', getAllProducts);   // GET /products -> getAllProducts çalışır
router.get('/:id', getProductById); // GET /products/3 -> tek ürün

module.exports = router;
