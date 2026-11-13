// Fake shared client instead of the real database
jest.mock('../src/config/supabaseClient', () => ({ from: jest.fn() }));

const supabase = require('../src/config/supabaseClient');
const { createReview } = require('../src/controllers/reviewController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const savedRow = (over = {}) => ({
  id: 1, product_id: 3, rating: 5, comment: null, comment_status: 'pending', ...over,
});

// Fakes the three queries by table name. Each argument is the result of one query.
function mockDb({ product = { data: { id: 3 }, error: null },
                  delivered = { data: [{ id: 10 }], error: null },
                  insert = { data: savedRow(), error: null } } = {}) {
  const calls = { insert: jest.fn(), orderEq: jest.fn() };

  supabase.from.mockImplementation((table) => {
    if (table === 'product_catalog') {
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(product) }) }) };
    }
    if (table === 'order_items') {
      const chain = {
        select: () => chain,
        eq: (...args) => { calls.orderEq(...args); return chain; },
        limit: () => Promise.resolve(delivered),
      };
      return chain;
    }
    if (table === 'reviews') {
      return {
        insert: (row) => {
          calls.insert(row);
          return { select: () => ({ single: () => Promise.resolve(insert) }) };
        },
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return calls;
}

const req = (body, id = '3') => ({ user: { id: 'user-1' }, params: { id }, body });

beforeEach(() => {
  supabase.from.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('POST /products/:id/reviews', () => {
  test('saves a rating and a comment as pending (201)', async () => {
    const calls = mockDb({ insert: { data: savedRow({ rating: 4, comment: 'Nice', }), error: null } });
    const res = mockRes();
    await createReview(req({ rating: 4, comment: 'Nice' }), res);

    expect(calls.insert).toHaveBeenCalledWith({ user_id: 'user-1', product_id: 3, rating: 4, comment: 'Nice' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 1, productId: 3, rating: 4, comment: 'Nice', commentStatus: 'pending',
    });
  });

  test('never sets comment_status itself (the column default "pending" is used)', async () => {
    const calls = mockDb();
    await createReview(req({ rating: 5, comment: 'Great', comment_status: 'approved' }), mockRes());
    expect(calls.insert.mock.calls[0][0]).not.toHaveProperty('comment_status');
  });

  test('saves a rating without a comment (comment is null)', async () => {
    const calls = mockDb();
    const res = mockRes();
    await createReview(req({ rating: 5 }), res);

    expect(calls.insert).toHaveBeenCalledWith({ user_id: 'user-1', product_id: 3, rating: 5, comment: null });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('trims the comment and treats a blank comment as none', async () => {
    const calls = mockDb();
    await createReview(req({ rating: 5, comment: '  hi  ' }), mockRes());
    expect(calls.insert.mock.calls[0][0].comment).toBe('hi');

    await createReview(req({ rating: 5, comment: '   ' }), mockRes());
    expect(calls.insert.mock.calls[1][0].comment).toBeNull();
  });

  test('takes user_id only from req.user, ignoring the body', async () => {
    const calls = mockDb();
    await createReview(req({ rating: 5, user_id: 'someone-else', product_id: 99 }), mockRes());

    const row = calls.insert.mock.calls[0][0];
    expect(row.user_id).toBe('user-1');
    expect(row.product_id).toBe(3);
  });

  test('returns 400 for a bad rating without querying', async () => {
    for (const rating of [0, 6, 4.5, '4', null, undefined]) {
      const res = mockRes();
      await createReview(req({ rating }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    const noBody = mockRes();
    await createReview(req(undefined), noBody); // no body at all
    expect(noBody.status).toHaveBeenCalledWith(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns 400 when the comment is not text or is over 1000 characters', async () => {
    for (const comment of [123, { a: 1 }, 'x'.repeat(1001)]) {
      const res = mockRes();
      await createReview(req({ rating: 5, comment }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('accepts a comment of exactly 1000 characters', async () => {
    mockDb();
    const res = mockRes();
    await createReview(req({ rating: 5, comment: 'x'.repeat(1000) }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('returns 404 for an invalid id without querying', async () => {
    for (const id of ['abc', '0', '-1', '1.5']) {
      const res = mockRes();
      await createReview(req({ rating: 5 }, id), res);
      expect(res.status).toHaveBeenCalledWith(404);
    }
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns 404 for an unknown product', async () => {
    const calls = mockDb({ product: { data: null, error: null } });
    const res = mockRes();
    await createReview(req({ rating: 5 }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(calls.insert).not.toHaveBeenCalled();
  });

  test('returns 403 without a delivered order and saves nothing', async () => {
    const calls = mockDb({ delivered: { data: [], error: null } });
    const res = mockRes();
    await createReview(req({ rating: 5 }), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(calls.insert).not.toHaveBeenCalled();
  });

  test('checks the delivered order for this user and this product', async () => {
    const calls = mockDb();
    await createReview(req({ rating: 5 }), mockRes());

    expect(supabase.from).toHaveBeenCalledWith('order_items');
    expect(calls.orderEq).toHaveBeenCalledWith('product_id', 3);
    expect(calls.orderEq).toHaveBeenCalledWith('orders.user_id', 'user-1');
    expect(calls.orderEq).toHaveBeenCalledWith('orders.status', 'delivered');
  });

  test('returns 409 when the user already reviewed the product', async () => {
    mockDb({ insert: { data: null, error: { code: '23505', message: 'duplicate key' } } });
    const res = mockRes();
    await createReview(req({ rating: 5 }), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'You have already reviewed this product' });
  });

  test('returns a generic 500 and hides the database error text', async () => {
    const secret = 'relation "order_items" secret-db-detail';
    const failures = {
      product: { product: { data: null, error: { message: secret } } },
      order: { delivered: { data: null, error: { message: secret } } },
      insert: { insert: { data: null, error: { code: '50000', message: secret } } },
    };

    for (const setup of Object.values(failures)) {
      mockDb(setup);
      const res = mockRes();
      await createReview(req({ rating: 5 }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(JSON.stringify(res.json.mock.calls)).not.toContain('secret-db-detail');
    }
    expect(console.error).toHaveBeenCalled(); // the real error is logged
  });
});
