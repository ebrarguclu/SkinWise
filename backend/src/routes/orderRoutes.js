const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { createOrder, getMyOrders } = require('../controllers/orderController');

const router = express.Router();
router.get('/', requireAuth, getMyOrders);   // GET /orders -> kullanıcının sipariş geçmişi
router.post('/', requireAuth, createOrder); // POST /orders -> sepetten sipariş oluşturur

module.exports = router;
