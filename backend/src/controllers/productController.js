const supabase = require('../config/supabaseClient');

// Kategori slug'i: sadece kucuk harf, rakam ve tire (ornek: "serum", "sun-care").
// categories tablosundaki slug kurali ile ayni (bkz. backend/supabase/schema.sql).
const CATEGORY_SLUG = /^[a-z0-9-]+$/;

// ---------- Arama (Sprint 2, Jira: Safiye, Catalog & Search) ----------
// Aranan kelimeler urunun adinda, aciklamasinda veya markasinda gecebilir.
// Stokta olmayan urunler de bulunur (stok filtresi yok); sepete eklenemezler (ProductCard).
const SEARCH_COLUMNS = ['name', 'description', 'brand'];
const SEARCH_MAX_LENGTH = 100;
const SEARCH_MAX_WORDS = 5;

// Aramayi kelimelere boler: "Vitamin C, serum!" -> ['Vitamin', 'C', 'serum']
// Sadece harf, rakam ve + - . ' kalir ("SPF 50+", "Paula's" gibi aramalar icin).
// Virgul, parantez, tirnak ve % _ * gibi Supabase filtresini bozabilecek karakterler bosluk olur.
function searchWords(q) {
  if (typeof q !== 'string') return [];
  return q
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}+.'-]+/gu, ' ')
    .split(' ')
    .filter((word) => /[\p{L}\p{N}]/u.test(word)) // en az bir harf veya rakam olmali
    .slice(0, SEARCH_MAX_WORDS);
}

// Bir kelime icin: name, description veya brand icinde gecsin (buyuk/kucuk harf fark etmez)
// -> name.ilike."%serum%",description.ilike."%serum%",brand.ilike."%serum%"
function searchFilter(word) {
  return SEARCH_COLUMNS.map((column) => `${column}.ilike."%${word}%"`).join(',');
}

// ---------- Siralama (Sprint 2) ----------
// Son satirdaki id, esit degerlerde siranin her seferinde ayni kalmasi icin.
// Populerlik: once satis adedi (sold_count), sonra ortalama puan (rating).
const SORTS = {
  'price-asc': [['price', { ascending: true }], ['id', { ascending: true }]],
  'price-desc': [['price', { ascending: false }], ['id', { ascending: true }]],
  popular: [['sold_count', { ascending: false }], ['rating', { ascending: false }], ['id', { ascending: true }]],
};

// GET /products                          -> tum urunler
// GET /products?category=serum           -> sadece o kategorinin urunleri
// GET /products?q=vitamin c              -> adinda/aciklamasinda "vitamin" VE "c" gecen urunler
// GET /products?sort=price-asc           -> fiyata gore artan (price-desc: azalan, popular: en populer)
// Hepsi birlikte de kullanilabilir: /products?category=serum&q=vitamin&sort=price-asc
async function getAllProducts(req, res) {
  const { category, q, sort } = req.query || {};

  // ?category= bos gelirse filtre uygulanmaz (tum urunler).
  // Gecersiz deger (buyuk harf, bosluk, birden fazla category) veritabanina hic gitmez.
  if (category !== undefined && category !== '' &&
      (typeof category !== 'string' || !CATEGORY_SLUG.test(category))) {
    return res.status(400).json({ error: 'Invalid category' }); // 400 = hatali istek
  }
  if (q !== undefined && typeof q !== 'string') {
    return res.status(400).json({ error: 'Invalid search' }); // ornek: ?q=a&q=b
  }
  if (typeof q === 'string' && q.length > SEARCH_MAX_LENGTH) {
    return res.status(400).json({ error: `Search text must be at most ${SEARCH_MAX_LENGTH} characters` });
  }
  if (sort !== undefined && sort !== '' &&
      (typeof sort !== 'string' || !Object.hasOwn(SORTS, sort))) {
    return res.status(400).json({ error: 'Invalid sort' });
  }

  // product_catalog view'i: aktif urunler + kategori slug'i + ortalama puan + satis adedi
  let query = supabase.from('product_catalog').select('*');
  if (category) {
    query = query.eq('category', category); // view'daki "category" kolonu = kategori slug'i
  }
  for (const word of searchWords(q)) {
    query = query.or(searchFilter(word)); // her kelime ayri bir kosul, hepsi saglanmali
  }
  if (sort) {
    for (const [column, options] of SORTS[sort]) {
      query = query.order(column, options);
    }
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

module.exports = { getAllProducts, getProductById, searchWords };
