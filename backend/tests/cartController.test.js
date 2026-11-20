// Fake shared client instead of the real database
jest.mock('../src/config/supabaseClient', () => ({ from: jest.fn() }));

const supabase = require('../src/config/supabaseClient');
const {
  getCart, addToCart, updateCartItem, removeCartItem, mergeCart,
} = require('../src/controllers/cartController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const CATALOG = [
  { id: 1, name: 'Gentle Hydrating Cleanser', emoji: '🫧', image_url: null, final_price: '12.99', stock: 10 },
  { id: 2, name: 'Vitamin C 15% Serum', emoji: '✨', image_url: 'serum.jpg', final_price: '22.99', stock: 3 },
  { id: 3, name: 'Kaolin Clay Mask', emoji: '🌿', image_url: null, final_price: '9.99', stock: 0 },
];

// A tiny in-memory version of the two tables the cart uses.
// It understands the same query chains the controller sends.
function fakeDb({ cart = [], fail = null } = {}) {
  const tables = {
    product_catalog: CATALOG.map((p) => ({ ...p })),
    cart_items: cart.map((r) => ({ ...r })),
  };

  supabase.from.mockImplementation((table) => {
    const filters = [];
    let op = 'select';
    let rows = null;
    const fails = () => fail && fail.table === table && fail.op === op;

    const run = async () => {
      if (fails()) return { data: null, error: { message: 'database is down' } };
      const match = (r) => filters.every((f) => f(r));
      if (op === 'upsert') {
        for (const row of rows) {
          const i = tables[table].findIndex((r) => r.user_id === row.user_id && r.product_id === row.product_id);
          if (i >= 0) tables[table][i] = { ...tables[table][i], ...row };
          else tables[table].push({ ...row });
        }
        return { data: null, error: null };
      }
      if (op === 'delete') {
        tables[table] = tables[table].filter((r) => !match(r));
        return { data: null, error: null };
      }
      return { data: tables[table].filter(match).map((r) => ({ ...r })), error: null };
    };

    const query = {
      select: () => query,
      eq: (col, val) => { filters.push((r) => r[col] === val); return query; },
      in: (col, vals) => { filters.push((r) => vals.includes(r[col])); return query; },
      upsert: (newRows) => { op = 'upsert'; rows = newRows; return query; },
      delete: () => { op = 'delete'; return query; },
      maybeSingle: () => run().then((r) => ({ data: r.data ? r.data[0] || null : null, error: r.error })),
      then: (resolve, reject) => run().then(resolve, reject),
    };
    return query;
  });
  return tables;
}

const req = ({ body = {}, params = {}, userId = 'user-1' } = {}) => ({ user: { id: userId }, body, params });
const lines = (tables, userId = 'user-1') => tables.cart_items
  .filter((r) => r.user_id === userId)
  .map((r) => [r.product_id, r.quantity]);

beforeEach(() => {
  supabase.from.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('GET /cart', () => {
  test('returns the saved cart with the current price and stock', async () => {
    fakeDb({ cart: [{ user_id: 'user-1', product_id: 2, quantity: 2 }] });
    const res = mockRes();
    await getCart(req(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [{ productId: 2, name: 'Vitamin C 15% Serum', emoji: '✨', imageUrl: 'serum.jpg', price: 22.99, stock: 3, quantity: 2 }],
    });
  });

  test('shows only the logged-in user\'s own cart', async () => {
    fakeDb({ cart: [{ user_id: 'user-2', product_id: 1, quantity: 5 }] });
    const res = mockRes();
    await getCart(req(), res);
    expect(res.json).toHaveBeenCalledWith({ items: [] });
  });

  test('leaves out products that are no longer on sale', async () => {
    fakeDb({ cart: [{ user_id: 'user-1', product_id: 42, quantity: 1 }, { user_id: 'user-1', product_id: 1, quantity: 1 }] });
    const res = mockRes();
    await getCart(req(), res);
    expect(res.json.mock.calls[0][0].items.map((i) => i.productId)).toEqual([1]);
  });

  test('returns 500 when the database cannot be reached', async () => {
    fakeDb({ fail: { table: 'cart_items', op: 'select' } });
    const res = mockRes();
    await getCart(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});

describe('POST /cart', () => {
  test('adds a new product with quantity 1 by default', async () => {
    const tables = fakeDb();
    const res = mockRes();
    await addToCart(req({ body: { productId: 1 } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toMatchObject({ added: 1, reason: null });
    expect(lines(tables)).toEqual([[1, 1]]);
  });

  test('adding the same product again increases its quantity instead of adding a second line', async () => {
    const tables = fakeDb({ cart: [{ user_id: 'user-1', product_id: 1, quantity: 2 }] });
    await addToCart(req({ body: { productId: 1, quantity: 3 } }), mockRes());
    expect(lines(tables)).toEqual([[1, 5]]);
  });

  test('adds only what is left in stock and says so', async () => {
    const tables = fakeDb({ cart: [{ user_id: 'user-1', product_id: 2, quantity: 2 }] });
    const res = mockRes();
    await addToCart(req({ body: { productId: 2, quantity: 5 } }), res);

    expect(res.json.mock.calls[0][0]).toMatchObject({ added: 1, reason: 'stock_limit' });
    expect(lines(tables)).toEqual([[2, 3]]);
  });

  test('returns 409 for an out-of-stock product and saves nothing', async () => {
    const tables = fakeDb();
    const res = mockRes();
    await addToCart(req({ body: { productId: 3 } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Kaolin Clay Mask is out of stock', reason: 'out_of_stock', available: 0 });
    expect(lines(tables)).toEqual([]);
  });

  test('returns 409 when the whole stock is already in the cart', async () => {
    fakeDb({ cart: [{ user_id: 'user-1', product_id: 2, quantity: 3 }] });
    const res = mockRes();
    await addToCart(req({ body: { productId: 2 } }), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].reason).toBe('stock_limit');
  });

  test('returns 400 for a missing product id or a bad quantity', async () => {
    fakeDb();
    for (const body of [{}, { productId: 'abc' }, { productId: 1, quantity: 0 }, { productId: 1, quantity: -2 }]) {
      const res = mockRes();
      await addToCart(req({ body }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
  });

  test('returns 404 for a product that is not on sale', async () => {
    fakeDb();
    const res = mockRes();
    await addToCart(req({ body: { productId: 42 } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('PATCH /cart/:productId', () => {
  test('changes the quantity of a product in the cart', async () => {
    const tables = fakeDb({ cart: [{ user_id: 'user-1', product_id: 1, quantity: 1 }] });
    const res = mockRes();
    await updateCartItem(req({ params: { productId: '1' }, body: { quantity: 4 } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toMatchObject({ quantity: 4, reason: null });
    expect(lines(tables)).toEqual([[1, 4]]);
  });

  test('never saves more than the stock', async () => {
    const tables = fakeDb({ cart: [{ user_id: 'user-1', product_id: 2, quantity: 1 }] });
    const res = mockRes();
    await updateCartItem(req({ params: { productId: '2' }, body: { quantity: 99 } }), res);

    expect(res.json.mock.calls[0][0]).toMatchObject({ quantity: 3, reason: 'stock_limit' });
    expect(lines(tables)).toEqual([[2, 3]]);
  });

  test('returns 400 for a quantity below 1 (DELETE removes a product)', async () => {
    fakeDb({ cart: [{ user_id: 'user-1', product_id: 1, quantity: 1 }] });
    const res = mockRes();
    await updateCartItem(req({ params: { productId: '1' }, body: { quantity: 0 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 404 when the product is not in this user\'s cart', async () => {
    fakeDb({ cart: [{ user_id: 'user-2', product_id: 1, quantity: 1 }] });
    const res = mockRes();
    await updateCartItem(req({ params: { productId: '1' }, body: { quantity: 2 } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('DELETE /cart/:productId', () => {
  test('removes the product from the user\'s cart only', async () => {
    const tables = fakeDb({
      cart: [
        { user_id: 'user-1', product_id: 1, quantity: 1 },
        { user_id: 'user-1', product_id: 2, quantity: 1 },
        { user_id: 'user-2', product_id: 1, quantity: 1 },
      ],
    });
    const res = mockRes();
    await removeCartItem(req({ params: { productId: '1' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(lines(tables)).toEqual([[2, 1]]);
    expect(lines(tables, 'user-2')).toEqual([[1, 1]]);
  });
});

describe('POST /cart/merge (after login)', () => {
  test('keeps the guest cart: new products are added, the same product is added up', async () => {
    const tables = fakeDb({ cart: [{ user_id: 'user-1', product_id: 1, quantity: 2 }] });
    const res = mockRes();
    await mergeCart(req({ body: { items: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }] } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(lines(tables)).toEqual([[1, 3], [2, 1]]);
    expect(res.json.mock.calls[0][0].adjusted).toEqual([]);
    expect(res.json.mock.calls[0][0].items).toHaveLength(2);
  });

  test('caps at the stock and reports what could not be kept', async () => {
    const tables = fakeDb({ cart: [{ user_id: 'user-1', product_id: 2, quantity: 2 }] });
    const res = mockRes();
    await mergeCart(req({ body: { items: [{ productId: 2, quantity: 4 }, { productId: 3, quantity: 1 }] } }), res);

    expect(lines(tables)).toEqual([[2, 3]]);
    expect(res.json.mock.calls[0][0].adjusted).toEqual([
      { productId: 2, requested: 4, quantity: 3, reason: 'stock_limit' },
      { productId: 3, requested: 1, quantity: 0, reason: 'out_of_stock' },
    ]);
  });

  test('returns 400 when items is not a list', async () => {
    fakeDb();
    const res = mockRes();
    await mergeCart(req({ body: { items: 'oops' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 500 and saves nothing when the database fails', async () => {
    fakeDb({ fail: { table: 'product_catalog', op: 'select' } });
    const res = mockRes();
    await mergeCart(req({ body: { items: [{ productId: 1, quantity: 1 }] } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
