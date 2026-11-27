// Integration tests for the cart API (Jira DP-14).
//
// The unit tests call the controller functions one by one. These tests start the
// real Express app on a free port and send real HTTP requests to it, so routing,
// JSON parsing, requireAuth and the controller are tested together.
// Only Supabase is replaced: a small in-memory database that, like the RLS
// policies on cart_items, lets each user see and change only their own lines.
jest.mock('../src/config/supabaseClient', () => ({}));
jest.mock('../src/config/supabaseFactory', () => {
  const USERS = { 'token-ayse': { id: 'user-ayse' }, 'token-mert': { id: 'user-mert' } };
  const db = {
    product_catalog: [],
    cart_items: [],
  };

  // RLS stand-in: every cart_items query of a user only sees that user's rows.
  function userClient(token) {
    const me = USERS[token];
    return {
      from(table) {
        const filters = table === 'cart_items' ? [(r) => r.user_id === me.id] : [];
        let op = 'select';
        let rows = [];
        const run = async () => {
          const match = (r) => filters.every((f) => f(r));
          if (op === 'upsert') {
            if (rows.some((r) => r.user_id !== me.id)) {
              return { data: null, error: { code: '42501', message: 'row-level security policy' } };
            }
            for (const row of rows) {
              const i = db[table].findIndex((r) => r.user_id === row.user_id && r.product_id === row.product_id);
              if (i >= 0) db[table][i] = { ...db[table][i], ...row };
              else db[table].push({ ...row });
            }
            return { data: null, error: null };
          }
          if (op === 'delete') {
            db[table] = db[table].filter((r) => !match(r));
            return { data: null, error: null };
          }
          return { data: db[table].filter(match).map((r) => ({ ...r })), error: null };
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
      },
    };
  }

  return {
    db,
    createAuthClient: () => ({
      auth: {
        getUser: async (token) => (USERS[token]
          ? { data: { user: USERS[token] }, error: null }
          : { data: { user: null }, error: { message: 'invalid token' } }),
      },
    }),
    createUserClient: userClient,
  };
});

const { db } = require('../src/config/supabaseFactory');
const app = require('../src/app');

let server;
let baseUrl;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  db.product_catalog = [
    { id: 1, name: 'Gentle Hydrating Cleanser', emoji: '🫧', image_url: null, final_price: '12.99', stock: 10 },
    { id: 2, name: 'Vitamin C 15% Serum', emoji: '✨', image_url: 'serum.jpg', final_price: '22.99', stock: 3 },
    { id: 3, name: 'Kaolin Clay Mask', emoji: '🌿', image_url: null, final_price: '9.99', stock: 0 },
  ];
  db.cart_items = [];
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

// Sends a request like the frontend does and returns { status, body }.
async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

describe('cart API over HTTP', () => {
  test('GET /cart without a token returns 401', async () => {
    const { status, body } = await call('GET', '/cart');
    expect(status).toBe(401);
    expect(body).toEqual({ error: 'Authentication required' });
  });

  test('GET /cart with an invalid token returns 401', async () => {
    const { status } = await call('GET', '/cart', { token: 'made-up' });
    expect(status).toBe(401);
  });

  test('a full visit: add, add again, change, remove', async () => {
    const token = 'token-ayse';
    let res = await call('POST', '/cart', { token, body: { productId: 1 } });
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([expect.objectContaining({ productId: 1, quantity: 1, price: 12.99 })]);

    res = await call('POST', '/cart', { token, body: { productId: 1, quantity: 2 } });
    expect(res.body.items[0].quantity).toBe(3); // same product: one line, quantity added up

    res = await call('PATCH', '/cart/1', { token, body: { quantity: 5 } });
    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(5);

    res = await call('DELETE', '/cart/1', { token });
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  test('adding more than the stock adds only what is left, then answers 409', async () => {
    const token = 'token-ayse';
    let res = await call('POST', '/cart', { token, body: { productId: 2, quantity: 5 } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ added: 3, reason: 'stock_limit' });

    res = await call('POST', '/cart', { token, body: { productId: 2 } });
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('stock_limit');
    expect(db.cart_items).toEqual([expect.objectContaining({ product_id: 2, quantity: 3 })]);
  });

  test('an out-of-stock product answers 409 out_of_stock and saves nothing', async () => {
    const res = await call('POST', '/cart', { token: 'token-ayse', body: { productId: 3 } });
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('out_of_stock');
    expect(db.cart_items).toEqual([]);
  });

  test('a bad body answers 400', async () => {
    const res = await call('POST', '/cart', { token: 'token-ayse', body: { productId: 1, quantity: -2 } });
    expect(res.status).toBe(400);
  });

  test('two users never see or change each other\'s cart', async () => {
    await call('POST', '/cart', { token: 'token-ayse', body: { productId: 1, quantity: 2 } });

    const mert = await call('GET', '/cart', { token: 'token-mert' });
    expect(mert.body.items).toEqual([]);

    const removed = await call('DELETE', '/cart/1', { token: 'token-mert' });
    expect(removed.body.items).toEqual([]);
    const ayse = await call('GET', '/cart', { token: 'token-ayse' });
    expect(ayse.body.items).toEqual([expect.objectContaining({ productId: 1, quantity: 2 })]);
  });

  test('POST /cart/merge keeps the guest cart at login and caps it at the stock', async () => {
    const token = 'token-ayse';
    await call('POST', '/cart', { token, body: { productId: 1, quantity: 2 } });
    const res = await call('POST', '/cart/merge', {
      token,
      body: { items: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 9 }] },
    });
    expect(res.status).toBe(200);
    const byId = Object.fromEntries(res.body.items.map((i) => [i.productId, i.quantity]));
    expect(byId).toEqual({ 1: 3, 2: 3 });
    expect(res.body.adjusted).toEqual([expect.objectContaining({ productId: 2, quantity: 3 })]);
  });

  test('GET /cart shows the current stock, so the page can warn when it dropped', async () => {
    const token = 'token-ayse';
    await call('POST', '/cart', { token, body: { productId: 1, quantity: 4 } });
    db.product_catalog[0].stock = 1; // someone else bought most of it
    const res = await call('GET', '/cart', { token });
    expect(res.body.items[0]).toMatchObject({ quantity: 4, stock: 1 });
  });
});
