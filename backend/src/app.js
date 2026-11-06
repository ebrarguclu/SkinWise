const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

const app = express();
app.use(cors());           // frontend'den gelen isteklere izin ver
app.use(express.json());   // gelen JSON verisini okuyabilmek için

// sunucu ayakta mı diye kontrol etmek için
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/products', productRoutes);
app.use('/categories', categoryRoutes);

module.exports = app;