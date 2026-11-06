jest.mock('../src/config/supabaseFactory', () => ({
  createAuthClient: jest.fn(),
  createUserClient: jest.fn(),
}));

const { createAuthClient, createUserClient } = require('../src/config/supabaseFactory');
const { requireAuth, requireRole } = require('../src/middleware/auth');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireAuth', () => {
  test('returns 401 without a token', async () => {
    const res = mockRes();
    const next = jest.fn();
    await requireAuth({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for an invalid token', async () => {
    createAuthClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: 'bad' } }) },
    });
    const res = mockRes();
    const next = jest.fn();
    await requireAuth({ headers: { authorization: 'Bearer bad' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('sets the user and continues for a valid token', async () => {
    const user = { id: 'user-1' };
    createAuthClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }) },
    });
    createUserClient.mockReturnValue('user-client');
    const req = { headers: { authorization: 'Bearer good' } };
    const next = jest.fn();
    await requireAuth(req, mockRes(), next);
    expect(req.user).toBe(user);
    expect(req.token).toBe('good');
    expect(req.supabase).toBe('user-client');
    expect(createUserClient).toHaveBeenCalledWith('good');
    expect(next).toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  function reqWithRole(result) {
    const maybeSingle = jest.fn().mockResolvedValue(result);
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    return {
      user: { id: 'user-1' },
      supabase: { from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq }) }) },
    };
  }

  test('allows a matching role', async () => {
    const next = jest.fn();
    await requireRole('product_manager')(reqWithRole({ data: { role: 'product_manager' }, error: null }), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('returns 403 for another role', async () => {
    const res = mockRes();
    const next = jest.fn();
    await requireRole('product_manager')(reqWithRole({ data: { role: 'customer' }, error: null }), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when there is no profile', async () => {
    const res = mockRes();
    const next = jest.fn();
    await requireRole('sales_manager')(reqWithRole({ data: null, error: null }), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
