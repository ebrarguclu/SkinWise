const supabase = require('../config/supabaseClient');

async function getAllProducts(req, res) {
  // products tablosundaki tüm satırları çek
  const { data, error } = await supabase.from('products').select('*');

  if (error) {
    return res.status(500).json({ error: error.message }); // 500 = sunucu hatası
  }
  return res.status(200).json(data);                       // 200 = başarılı
}

module.exports = { getAllProducts };
