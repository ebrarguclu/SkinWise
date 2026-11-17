const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { createOrder } = require('../controllers/orderController');

const router = express.Router();
router.post('/', requireAuth, createOrder); // POST /orders -> sepetten sipariş oluşturur

module.exports = router;
