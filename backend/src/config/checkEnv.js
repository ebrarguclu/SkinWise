// Sunucu acilirken .env ayarlarini kontrol eder ve sorunlari liste olarak dondurur.
// Siparis, sepet ve yorum tablolarinda kullanicilar icin RLS kurali yok; bu yuzden
// backend'in secret key (sb_secret_...) ile calismasi gerekir. Publishable key ile
// katalog calisir ama bu ozellikler sessizce hata verir.
function checkEnv(env) {
  const problems = [];

  if (!env.SUPABASE_URL) {
    problems.push('SUPABASE_URL is missing in backend/.env');
  }

  const key = env.SUPABASE_KEY;
  if (!key) {
    problems.push('SUPABASE_KEY is missing in backend/.env');
  } else if (key.startsWith('sb_publishable_')) {
    problems.push(
      'SUPABASE_KEY is a publishable key. Orders, cart and reviews need the secret key (sb_secret_...). ' +
        'Copy it from Supabase Dashboard > Project Settings > API Keys.'
    );
  }

  return problems;
}

module.exports = { checkEnv };
