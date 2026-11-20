const { createClient } = require('@supabase/supabase-js');

const options = { auth: { persistSession: false, autoRefreshToken: false } };

// Giris/kayit icin her istekte yeni client: ortak client'a oturum yazilirsa
// sonraki istekler o kullanicinin kimligiyle calisir.
function createAuthClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, options);
}

// Sorgulari kullanicinin kimligiyle calistirir, boylece RLS kurallari gecerli olur.
function createUserClient(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    ...options,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

module.exports = { createAuthClient, createUserClient };
