require('dotenv').config();   // .env'deki bilgileri en başta yükle
const app = require('./app');
const { checkEnv } = require('./config/checkEnv');

// Yanlis anahtar gibi ayar hatalarini sunucu acilirken goster
for (const problem of checkEnv(process.env)) {
  console.warn(`⚠️  ${problem}`);
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
