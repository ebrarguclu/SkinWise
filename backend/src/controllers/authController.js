const { createAuthClient } = require('../config/supabaseFactory');

const MIN_PASSWORD_LENGTH = 8;
const isText = (value) => typeof value === 'string' && value.trim() !== '';

function sessionResponse(session) {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  };
}

async function register(req, res) {
  const { name, taxId, email, address, password } = req.body || {};

  if (![name, taxId, email, address].every(isText) || typeof password !== 'string') {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const { data, error } = await createAuthClient().auth.signUp({
    email: email.trim(),
    password,
    // Profil satirini veritabanindaki trigger bu bilgilerle acar. Rol burada gonderilmez.
    options: { data: { full_name: name.trim(), tax_id: taxId.trim(), address: address.trim() } },
  });

  if (error) {
    if (error.code === 'user_already_exists') {
      return res.status(409).json({ error: 'This email is already registered' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Too many attempts. Please try again later' });
    }
    if (error.status && error.status < 500) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }

  // E-posta dogrulamasi aciksa Supabase kayitli e-posta icin hata yerine bos identities doner.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return res.status(409).json({ error: 'This email is already registered' });
  }

  // E-posta dogrulamasi aciksa session gelmez; kullanici once e-postasini onaylar.
  return res.status(201).json({
    session: data.session ? sessionResponse(data.session) : null,
  });
}

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!isText(email) || !isText(password)) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await createAuthClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    if (error.code === 'email_not_confirmed') {
      return res.status(403).json({ error: 'Please confirm your email before logging in' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Too many attempts. Please try again later' });
    }
    if (error.status && error.status < 500) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ session: sessionResponse(data.session) });
}

async function refresh(req, res) {
  const { refreshToken } = req.body || {};

  if (!isText(refreshToken)) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const { data, error } = await createAuthClient().auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session) {
    if (error && (!error.status || error.status >= 500)) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  return res.status(200).json({ session: sessionResponse(data.session) });
}

async function logout(req, res) {
  const { error } = await createAuthClient().auth.admin.signOut(req.token, 'local');

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  return res.status(204).end();
}

async function getMe(req, res) {
  const { data, error } = await req.supabase
    .from('profiles')
    .select('full_name, tax_id, address, role')
    .eq('id', req.user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  return res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    name: data.full_name,
    taxId: data.tax_id,
    address: data.address,
    role: data.role,
  });
}

module.exports = { register, login, refresh, logout, getMe };
