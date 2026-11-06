const supabase = require('../config/supabaseClient');

// Kategori slug'i: sadece kucuk harf, rakam ve tire (ornek: "serum", "sun-care").
// categories tablosundaki slug kurali ile ayni (bkz. backend/supabase/schema.sql).
const CATEGORY_SLUG = /^[a-z0-9-]+$/;

// GET /products                  -> tum urunler
// GET /products?category=serum   -> sadece o kategorinin urunleri (Jira: Safiye, Catalog & Search)
async function getAllProducts(req, res) {
  const category = req.query?.category;

  // ?category= bos gelirse filtre uygulanmaz (tum urunler).
  // Gecersiz deger (buyuk harf, bosluk, birden fazla category) veritabanina hic gitmez.
  if (category !== undefined && category !== '' &&
      (typeof category !== 'string' || !CATEGORY_SLUG.test(category))) {
    return res.status(400).json({ error: 'Invalid category' }); // 400 = hatali istek
  }

  // product_catalog view'i: aktif urunler + kategori slug'i + ortalama puan
  let query = supabase.from('product_catalog').select('*');
  if (category) {
    query = query.eq('category', category); // view'daki "category" kolonu = kategori slug'i
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message }); // 500 = sunucu hatası
  }
  return res.status(200).json(data ?? []);                 // kategoride urun yoksa bos liste
}

async function getProductById(req, res) {
  const id = Number(req.params.id);

  // sayi olmayan id'ler veritabanina gitmeden 404 doner
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const { data, error } = await supabase
    .from('product_catalog')
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
