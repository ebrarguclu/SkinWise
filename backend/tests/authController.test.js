// Gercek Supabase'e gitmemek icin client'lari sahtesiyle degistiriyoruz
jest.mock('../src/config/supabaseFactory', () => ({
  createAuthClient: jest.fn(),
  createUserClient: jest.fn(),
}));

const { createAuthClient } = require('../src/config/supabaseFactory');
const { register, login, refresh, logout, getMe } = require('../src/controllers/authController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
}

function mockAuth(methods) {
  createAuthClient.mockReturnValue({ auth: methods });
  return methods;
}

const validBody = {
  name: ' Ada ',
  taxId: '123',
  email: 'ada@example.test',
  address: 'Istanbul',
  password: 'test-pass-1',
};
const session = { access_token: 'access', refresh_token: 'refresh' };

describe('POST /auth/register', () => {
  test('returns 400 when a field is missing', async () => {
    const auth = mockAuth({ signUp: jest.fn() });
    const res = mockRes();
    await register({ body: { ...validBody, address: '  ' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  test('returns 400 when there is no body', async () => {
    mockAuth({ signUp: jest.fn() });
    const res = mockRes();
    await register({}, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 for a short password', async () => {
    const auth = mockAuth({ signUp: jest.fn() });
    const res = mockRes();
    await register({ body: { ...validBody, password: 'short' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  test('ignores a role sent by the client', async () => {
    const auth = mockAuth({
      signUp: jest.fn().mockResolvedValue({ data: { user: { identities: [{}] }, session }, error: null }),
    });
    const res = mockRes();
    await register({ body: { ...validBody, role: 'sales_manager' } }, res);
    expect(auth.signUp.mock.calls[0][0].options.data).toEqual({
      full_name: 'Ada',
      tax_id: '123',
      address: 'Istanbul',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ session: { accessToken: 'access', refreshToken: 'refresh' } });
  });

  test('returns a null session when email confirmation is required', async () => {
    mockAuth({
      signUp: jest.fn().mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null }),
    });
    const res = mockRes();
    await register({ body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ session: null });
  });

  test('returns 409 for an existing email', async () => {
    mockAuth({
      signUp: jest.fn().mockResolvedValue({
        data: {},
        error: { code: 'user_already_exists', status: 422, message: 'exists' },
      }),
    });
    const res = mockRes();
    await register({ body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('returns 409 for an existing email when confirmation hides the error', async () => {
    mockAuth({
      signUp: jest.fn().mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null }),
    });
    const res = mockRes();
    await register({ body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('POST /auth/login', () => {
  test('returns 200 and the session', async () => {
    mockAuth({ signInWithPassword: jest.fn().mockResolvedValue({ data: { session }, error: null }) });
    const res = mockRes();
    await login({ body: { email: 'ada@example.test', password: 'test-pass-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ session: { accessToken: 'access', refreshToken: 'refresh' } });
  });

  test('returns 401 with a generic message for wrong credentials', async () => {
    mockAuth({
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {},
        error: { code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' },
      }),
    });
    const res = mockRes();
    await login({ body: { email: 'ada@example.test', password: 'wrong-pass' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Incorrect email or password' });
  });

  test('returns 403 when the email is not confirmed', async () => {
    mockAuth({
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {},
        error: { code: 'email_not_confirmed', status: 400, message: 'Email not confirmed' },
      }),
    });
    const res = mockRes();
    await login({ body: { email: 'ada@example.test', password: 'test-pass-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('returns 400 when the password is missing', async () => {
    mockAuth({ signInWithPassword: jest.fn() });
    const res = mockRes();
    await login({ body: { email: 'ada@example.test' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('POST /auth/refresh', () => {
  test('returns a new session', async () => {
    mockAuth({ refreshSession: jest.fn().mockResolvedValue({ data: { session }, error: null }) });
    const res = mockRes();
    await refresh({ body: { refreshToken: 'old' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 401 for an invalid refresh token', async () => {
    mockAuth({
      refreshSession: jest.fn().mockResolvedValue({ data: { session: null }, error: { status: 400, message: 'bad' } }),
    });
    const res = mockRes();
    await refresh({ body: { refreshToken: 'bad' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('POST /auth/logout', () => {
  test('revokes the current session', async () => {
    const signOut = jest.fn().mockResolvedValue({ error: null });
    mockAuth({ admin: { signOut } });
    const res = mockRes();
    await logout({ token: 'access' }, res);
    expect(signOut).toHaveBeenCalledWith('access', 'local');
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('GET /auth/me', () => {
  function reqWithProfile(result) {
    const maybeSingle = jest.fn().mockResolvedValue(result);
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    return {
      user: { id: 'user-1', email: 'ada@example.test' },
      supabase: { from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq }) }) },
    };
  }

  test('returns the profile', async () => {
    const req = reqWithProfile({
      data: { full_name: 'Ada', tax_id: '123', address: 'Istanbul', role: 'customer' },
      error: null,
    });
    const res = mockRes();
    await getMe(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'ada@example.test',
      name: 'Ada',
      taxId: '123',
      address: 'Istanbul',
      role: 'customer',
    });
  });

  test('returns 404 when there is no profile', async () => {
    const res = mockRes();
    await getMe(reqWithProfile({ data: null, error: null }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
