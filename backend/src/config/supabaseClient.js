const { createClient } = require('@supabase/supabase-js');

// .env'deki bilgilerle veritabanına bağlantı oluşturuyoruz
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = supabase;
