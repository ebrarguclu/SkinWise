// Fake shared client instead of the real database
jest.mock('../src/config/supabaseClient', () => ({ from: jest.fn() }));

const supabase = require('../src/config/supabaseClient');
const { createReview, getReviewEligibility, listReviews, displayName } = require('../src/controllers/reviewController');

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

describe('GET /products/:id/reviews/eligibility', () => {
  // Fakes the three queries: product, delivered order, existing review
  function mockEligibilityDb({ product = { data: { id: 3 }, error: null },
                               delivered = { data: [{ id: 10 }], error: null },
                               existing = { data: null, error: null } } = {}) {
    const calls = { orderEq: jest.fn(), reviewEq: jest.fn() };

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
        const chain = {
          select: () => chain,
          eq: (...args) => { calls.reviewEq(...args); return chain; },
          maybeSingle: () => Promise.resolve(existing),
        };
        return chain;
      }
      throw new Error(`unexpected table ${table}`);
    });
    return calls;
  }

  const eligibilityReq = (id = '3', body = {}) => ({ user: { id: 'user-1' }, params: { id }, body });

  test('returns canReview true for a delivered product not reviewed yet', async () => {
    mockEligibilityDb();
    const res = mockRes();
    await getReviewEligibility(eligibilityReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ canReview: true, reason: null });
  });

  test('returns not_delivered when the user has no delivered order', async () => {
    mockEligibilityDb({ delivered: { data: [], error: null } });
    const res = mockRes();
    await getReviewEligibility(eligibilityReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ canReview: false, reason: 'not_delivered' });
  });

  test('returns already_reviewed when the user has a review for the product', async () => {
    mockEligibilityDb({ existing: { data: { id: 7 }, error: null } });
    const res = mockRes();
    await getReviewEligibility(eligibilityReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ canReview: false, reason: 'already_reviewed' });
  });

  test('uses only req.user.id for the order and review checks', async () => {
    const calls = mockEligibilityDb();
    await getReviewEligibility(eligibilityReq('3', { user_id: 'someone-else' }), mockRes());

    expect(calls.orderEq).toHaveBeenCalledWith('orders.user_id', 'user-1');
    expect(calls.orderEq).toHaveBeenCalledWith('orders.status', 'delivered');
    expect(calls.reviewEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(calls.reviewEq).toHaveBeenCalledWith('product_id', 3);
  });

  test('returns 404 for an invalid id without querying', async () => {
    for (const id of ['abc', '0', '-1', '1.5']) {
      const res = mockRes();
      await getReviewEligibility(eligibilityReq(id), res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
    }
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns 404 for an unknown product', async () => {
    mockEligibilityDb({ product: { data: null, error: null } });
    const res = mockRes();
    await getReviewEligibility(eligibilityReq(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
  });

  test('returns a generic 500 and hides the database error text', async () => {
    const dbError = { message: 'secret-db-detail' };
    const failures = [
      { product: { data: null, error: dbError } },
      { delivered: { data: null, error: dbError } },
      { existing: { data: null, error: dbError } },
    ];

    for (const setup of failures) {
      mockEligibilityDb(setup);
      const res = mockRes();
      await getReviewEligibility(eligibilityReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(JSON.stringify(res.json.mock.calls)).not.toContain('secret-db-detail');
    }
    expect(console.error).toHaveBeenCalled();
  });
});

describe('GET /products/:id/reviews', () => {
  const listReq = (id = '3') => ({ params: { id } });

  // Fakes the product lookup and the reviews query. Records every chained call.
  function mockListDb({ product = { data: { id: 3 }, error: null },
                        reviews = { data: [], error: null } } = {}) {
    const calls = { select: jest.fn(), eq: jest.fn(), not: jest.fn(), neq: jest.fn(),
                    order: jest.fn(), limit: jest.fn() };

    supabase.from.mockImplementation((table) => {
      if (table === 'product_catalog') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(product) }) }) };
      }
      if (table === 'reviews') {
        const chain = {
          select: (...a) => { calls.select(...a); return chain; },
          eq: (...a) => { calls.eq(...a); return chain; },
          not: (...a) => { calls.not(...a); return chain; },
          neq: (...a) => { calls.neq(...a); return chain; },
          order: (...a) => { calls.order(...a); return chain; },
          limit: (...a) => { calls.limit(...a); return Promise.resolve(reviews); },
        };
        return chain;
      }
      throw new Error(`unexpected table ${table}`);
    });
    return calls;
  }

  const row = (over = {}) => ({
    id: 12, rating: 5, comment: 'Great serum', created_at: '2026-11-18T10:00:00Z',
    profiles: { full_name: 'Ada Yilmaz' }, ...over,
  });

  test('returns approved comments with a short author name', async () => {
    mockListDb({ reviews: { data: [row()], error: null } });
    const res = mockRes();
    await listReviews(listReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      { id: 12, rating: 5, comment: 'Great serum', author: 'Ada Y.', createdAt: '2026-11-18T10:00:00Z' },
    ]);
  });

  test('asks only for approved, non-empty comments, newest first, max 50', async () => {
    const calls = mockListDb();
    await listReviews(listReq(), mockRes());

    expect(calls.eq).toHaveBeenCalledWith('product_id', 3);
    expect(calls.eq).toHaveBeenCalledWith('comment_status', 'approved');
    expect(calls.not).toHaveBeenCalledWith('comment', 'is', null);
    expect(calls.neq).toHaveBeenCalledWith('comment', '');
    expect(calls.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(calls.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(calls.limit).toHaveBeenCalledWith(50);
  });

  test('reads only full_name from profiles', async () => {
    const calls = mockListDb();
    await listReviews(listReq(), mockRes());

    const selected = calls.select.mock.calls[0][0];
    expect(selected).toContain('profiles(full_name)');
    for (const secret of ['user_id', 'email', 'tax_id', 'address']) {
      expect(selected).not.toContain(secret);
    }
  });

  test('never returns user_id, email, tax_id or address', async () => {
    const leaky = row({
      user_id: 'user-1',
      profiles: { full_name: 'Ada Yilmaz', email: 'ada@example.test', tax_id: '123', address: 'Istanbul' },
    });
    mockListDb({ reviews: { data: [leaky], error: null } });
    const res = mockRes();
    await listReviews(listReq(), res);

    const [list] = res.json.mock.calls[0];
    expect(Object.keys(list[0]).sort()).toEqual(['author', 'comment', 'createdAt', 'id', 'rating']);
    expect(JSON.stringify(list)).not.toMatch(/user-1|ada@example|123|Istanbul|Yilmaz/);
  });

  test('works when profiles comes back as a list', async () => {
    mockListDb({ reviews: { data: [row({ profiles: [{ full_name: 'Ada Yilmaz' }] })], error: null } });
    const res = mockRes();
    await listReviews(listReq(), res);
    expect(res.json.mock.calls[0][0][0].author).toBe('Ada Y.');
  });

  test('uses "Anonymous customer" when the profile or name is missing', async () => {
    mockListDb({ reviews: { data: [row({ profiles: null }), row({ id: 13, profiles: { full_name: '' } })], error: null } });
    const res = mockRes();
    await listReviews(listReq(), res);
    expect(res.json.mock.calls[0][0].map((r) => r.author)).toEqual(['Anonymous customer', 'Anonymous customer']);
  });

  test('returns an empty list when there are no approved comments', async () => {
    mockListDb({ reviews: { data: [], error: null } });
    const res = mockRes();
    await listReviews(listReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test('returns 404 for an invalid id without querying', async () => {
    for (const id of ['abc', '0', '-1', '1.5']) {
      const res = mockRes();
      await listReviews(listReq(id), res);
      expect(res.status).toHaveBeenCalledWith(404);
    }
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns 404 for an unknown product', async () => {
    mockListDb({ product: { data: null, error: null } });
    const res = mockRes();
    await listReviews(listReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
  });

  test('returns a generic 500 and hides the database error text', async () => {
    const dbError = { message: 'secret-db-detail' };
    for (const setup of [{ product: { data: null, error: dbError } }, { reviews: { data: null, error: dbError } }]) {
      mockListDb(setup);
      const res = mockRes();
      await listReviews(listReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(JSON.stringify(res.json.mock.calls)).not.toContain('secret-db-detail');
    }
    expect(console.error).toHaveBeenCalled();
  });
});

describe('displayName', () => {
  test('shows the first name and the last initial', () => {
    expect(displayName('Ada Yilmaz')).toBe('Ada Y.');
  });

  test('trims and collapses extra spaces', () => {
    expect(displayName('  Ada    Yilmaz  ')).toBe('Ada Y.');
  });

  test('uses the last word for the initial when there are several names', () => {
    expect(displayName('Ada Maria Yilmaz')).toBe('Ada Y.');
  });

  test('uppercases with Turkish rules', () => {
    expect(displayName('İdil Sunar')).toBe('İdil S.');
    expect(displayName('Ece ışık')).toBe('Ece I.');
    expect(displayName('Ece iplik')).toBe('Ece İ.');
  });

  test('keeps a single name as it is', () => {
    expect(displayName('Ada')).toBe('Ada');
    expect(displayName('  Ada  ')).toBe('Ada');
  });

  test('returns "Anonymous customer" for an empty or missing name', () => {
    for (const name of ['', '   ', null, undefined]) {
      expect(displayName(name)).toBe('Anonymous customer');
    }
  });
});
