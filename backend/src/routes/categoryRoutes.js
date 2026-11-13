const express = require('express');
const { getAllCategories } = require('../controllers/categoryController');

const router = express.Router();
router.get('/', getAllCategories);   // GET /categories

module.exports = router;
