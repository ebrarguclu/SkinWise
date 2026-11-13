const supabase = require('../config/supabaseClient');

// GET /categories -> tum kategoriler: [{ id, name, slug, icon }]
async function getAllCategories(req, res) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .order('id');

  if (error) {
    return res.status(500).json({ error: error.message }); // veritabanina ulasilamadi
  }
  return res.status(200).json(data ?? []);                 // kategori yoksa bos liste
}

module.exports = { getAllCategories };
