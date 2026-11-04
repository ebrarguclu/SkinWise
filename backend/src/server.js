require('dotenv').config();   // .env'deki bilgileri en başta yükle
const app = require('./app');

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));