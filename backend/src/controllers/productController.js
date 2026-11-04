const supabase = require('../config/supabaseClient');

async function getAllProducts(req, res) {
  // products tablosundaki tüm satırları çek
  const { data, error } = await supabase.from('products').select('*');

  if (error) {
    return res.status(500).json({ error: error.message }); // 500 = sunucu hatası
  }
  return res.status(200).json(data);                       // 200 = başarılı
}

async function getProductById(req, res) {
  const id = Number(req.params.id);

  // sayi olmayan id'ler veritabanina gitmeden 404 doner
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'Product not found' });
  }
  return res.status(200).json(data);
}

module.exports = { getAllProducts, getProductById };
