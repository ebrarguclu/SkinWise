const { createAuthClient, createUserClient } = require('../config/supabaseFactory');

// Authorization: Bearer <token> basligini dogrular, kullaniciyi req.user'a koyar.
async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { data, error } = await createAuthClient().auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.user = data.user;
  req.token = token;
  req.supabase = createUserClient(token);
  return next();
}

// requireAuth'tan sonra kullanilir: router.post('/', requireAuth, requireRole('product_manager'), ...)
function requireRole(...roles) {
  return async (req, res, next) => {
    const { data, error } = await req.supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (!data || !roles.includes(data.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
