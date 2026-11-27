// DP-45: security tests for unauthorised access.
// These tests send real HTTP requests to the Express app, so routes, middleware
// and controllers are tested together. Only Supabase is faked.

const express = require('express');

// Two test users. A token is just a name here; the fake auth client maps it to a user.
const mockUsers = {
  'token-alice': { id: 'alice-id', email: 'alice@example.com', role: 'customer' },
  'token-bob': { id: 'bob-id', email: 'bob@example.com', role: 'customer' },
  'token-manager': { id: 'manager-id', email: 'manager@example.com', role: 'product_manager' },
};
const ALICE = mockUsers['token-alice'];
const BOB = mockUsers['token-bob'];

// Every database call is written here so the tests can check which user it was for.
const mockQueries = [];

// A fake query builder: every method returns itself and is recorded.
// Awaiting it gives a list (one product for product_catalog, otherwise empty).
// maybeSingle/single give one row or null (see mockRow).
function mockTable(table, client) {
  const query = { table, client, calls: [] };
  mockQueries.push(query);
  const chain = new Proxy({}, {
    get(_target, method) {
      if (method === 'then') {
        const data = table === 'product_catalog'
          ? [{ id: 3, name: 'Serum', final_price: 10, stock: 10 }]
          : [];
        return (resolve, reject) => Promise.resolve({ data, error: null }).then(resolve, reject);
      }
      return (...args) => {
        query.calls.push([method, ...args]);
        if (method === 'maybeSingle' || method === 'single') {
          return Promise.resolve({ data: mockRow(query), error: null });
        }
        return chain;
      };
    },
  });
  return chain;
}

// Rows the code needs to get past its first checks, so it reaches the queries
// that use the user id: a product that exists, a cart line, and for profiles
// the row of the user the query asked for (so getMe and requireRole see a real role).
function mockRow(query) {
  if (query.table === 'product_catalog') return { id: 3 };
  if (query.table === 'cart_items') return { quantity: 1 };
  if (query.table !== 'profiles') return null;
  const idFilter = query.calls.find(([method, column]) => method === 'eq' && column === 'id');
  const user = idFilter && Object.values(mockUsers).find((u) => u.id === idFilter[2]);
  if (!user) return null;
  return { full_name: user.email, tax_id: '1', address: 'Istanbul', role: user.role };
}

jest.mock('../src/config/supabaseClient', () => ({
  from: (table) => mockTable(table, 'shared'),
}));

jest.mock('../src/config/supabaseFactory', () => ({
  createAuthClient: () => ({
    auth: {
      getUser: async (token) => {
        const user = mockUsers[token];
        return user
          ? { data: { user: { id: user.id, email: user.email } }, error: null }
          : { data: { user: null }, error: { message: 'invalid JWT' } };
      },
      admin: { signOut: async () => ({ error: null }) },
    },
  }),
  createUserClient: (token) => ({ from: (table) => mockTable(table, `user:${token}`) }),
}));

const app = require('../src/app');
const { requireAuth, requireRole } = require('../src/middleware/auth');

// There are no manager endpoints yet. This route uses the same middleware a
// manager endpoint will use, so the 403 rule is tested now.
// When real manager endpoints are added, add them to MANAGER_ROUTES below.
const testApp = express();
testApp.get(
  '/test-only/manager',
  requireAuth,
  requireRole('product_manager', 'sales_manager'),
  (req, res) => res.status(200).json({ ok: true }),
);
testApp.use(app);

// Every endpoint that needs a logged-in user.
// A new protected endpoint should be added here.
const PROTECTED_ROUTES = [
  ['GET', '/auth/me'],
  ['POST', '/auth/logout'],
  ['GET', '/orders'],
  ['POST', '/orders'],
  ['GET', '/cart'],
  ['POST', '/cart'],
  ['POST', '/cart/merge'],
  ['PATCH', '/cart/3'],
  ['DELETE', '/cart/3'],
  ['GET', '/products/3/reviews/eligibility'],
  ['POST', '/products/3/reviews'],
];

const MANAGER_ROUTES = [
  ['GET', '/test-only/manager'],
];

let server;
let baseUrl;

beforeAll(async () => {
  server = testApp.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  mockQueries.length = 0;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

async function request(method, path, { token, authorization, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authorization !== undefined) headers.Authorization = authorization;
  else if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(baseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

// All user ids the app filtered or wrote with, e.g. eq('user_id', x) or insert({ user_id: x }).
function userIdsUsed() {
  const ids = [];
  for (const query of mockQueries) {
    for (const [method, ...args] of query.calls) {
      if (method === 'eq' && ((typeof args[0] === 'string' && args[0].endsWith('user_id')) || (query.table === 'profiles' && args[0] === 'id'))) {
        ids.push(args[1]);
      }
      if ((method === 'insert' || method === 'upsert' || method === 'update') && args[0]) {
        const rows = Array.isArray(args[0]) ? args[0] : [args[0]];
        rows.forEach((row) => { if (row.user_id !== undefined) ids.push(row.user_id); });
      }
    }
  }
  return ids;
}

describe('requests without a valid token get 401', () => {
  test.each(PROTECTED_ROUTES)('%s %s without a token', async (method, path) => {
    const res = await request(method, path, { body: method === 'GET' ? undefined : {} });
    expect(res.status).toBe(401);
    expect(mockQueries).toHaveLength(0); // nothing was read from the database
  });

  test.each(PROTECTED_ROUTES)('%s %s with an invalid token', async (method, path) => {
    const res = await request(method, path, { token: 'not-a-real-token', body: method === 'GET' ? undefined : {} });
    expect(res.status).toBe(401);
    expect(mockQueries).toHaveLength(0);
  });

  test.each([
    ['no "Bearer" word', 'token-alice'],
    ['wrong scheme', 'Basic token-alice'],
    ['empty token', 'Bearer '],
    ['lowercase scheme', 'bearer token-alice'],
  ])('a malformed Authorization header (%s) gets 401', async (_name, authorization) => {
    const res = await request('GET', '/orders', { authorization });
    expect(res.status).toBe(401);
  });

  test('public endpoints still work without a token', async () => {
    expect((await request('GET', '/health')).status).toBe(200);
    expect((await request('GET', '/products')).status).not.toBe(401);
    expect((await request('GET', '/categories')).status).not.toBe(401);
  });
});

describe('customers calling manager endpoints get 403', () => {
  test.each(MANAGER_ROUTES)('%s %s as a customer', async (method, path) => {
    const res = await request(method, path, { token: 'token-alice' });
    expect(res.status).toBe(403);
  });

  test.each(MANAGER_ROUTES)('%s %s without a token gets 401, not 403', async (method, path) => {
    const res = await request(method, path);
    expect(res.status).toBe(401);
  });

  test.each(MANAGER_ROUTES)('%s %s as a product manager is allowed', async (method, path) => {
    const res = await request(method, path, { token: 'token-manager' });
    expect(res.status).toBe(200);
  });

  test('the role is read from the database, not from the request', async () => {
    const res = await request('GET', '/test-only/manager?role=product_manager', {
      token: 'token-alice',
      body: undefined,
    });
    expect(res.status).toBe(403);
  });
});

describe("a user cannot read or change another user's data", () => {
  test("GET /orders only reads the logged-in user's orders, even if another id is sent", async () => {
    const res = await request('GET', `/orders?userId=${BOB.id}&user_id=${BOB.id}`, { token: 'token-alice' });
    expect(res.status).toBe(200);
    expect(userIdsUsed()).toContain(ALICE.id);
    expect(userIdsUsed()).not.toContain(BOB.id);
  });

  test('POST /orders ignores a user id in the body', async () => {
    await request('POST', '/orders', {
      token: 'token-alice',
      body: { userId: BOB.id, user_id: BOB.id, deliveryAddress: 'Tuzla' },
    });
    expect(userIdsUsed()).toContain(ALICE.id);
    expect(userIdsUsed()).not.toContain(BOB.id);
  });

  test("GET /auth/me returns the logged-in user's profile, even if another id is sent", async () => {
    const res = await request('GET', `/auth/me?id=${BOB.id}&userId=${BOB.id}`, { token: 'token-alice' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ALICE.id);
    expect(res.body.email).toBe(ALICE.email);
    expect(userIdsUsed()).toContain(ALICE.id);
    expect(userIdsUsed()).not.toContain(BOB.id);
  });

  test('Bob gets his own profile with his own token', async () => {
    const res = await request('GET', '/auth/me', { token: 'token-bob' });
    expect(res.body.id).toBe(BOB.id);
    expect(userIdsUsed()).not.toContain(ALICE.id);
  });

  test.each([
    ['GET', '/cart', undefined],
    ['POST', '/cart', { productId: 3, quantity: 1, userId: BOB.id, user_id: BOB.id }],
    ['PATCH', '/cart/3', { quantity: 2, userId: BOB.id, user_id: BOB.id }],
    ['DELETE', '/cart/3', undefined],
    ['POST', '/cart/merge', { items: [{ productId: 3, quantity: 1 }], userId: BOB.id }],
  ])("%s %s only touches the logged-in user's cart", async (method, path, body) => {
    await request(method, `${path}?userId=${BOB.id}`, { token: 'token-alice', body });
    expect(userIdsUsed()).toContain(ALICE.id);
    expect(userIdsUsed()).not.toContain(BOB.id);
  });

  test.each([
    ['GET', '/products/3/reviews/eligibility', undefined],
    ['POST', '/products/3/reviews', { rating: 5, comment: 'Great', userId: BOB.id, user_id: BOB.id }],
  ])('%s %s uses the logged-in user, not one from the request', async (method, path, body) => {
    await request(method, `${path}?userId=${BOB.id}`, { token: 'token-alice', body });
    expect(userIdsUsed()).toContain(ALICE.id);
    expect(userIdsUsed()).not.toContain(BOB.id);
  });

  test('queries that use the user client run with the caller\'s own token', async () => {
    await request('GET', '/auth/me', { token: 'token-alice' });
    const userClients = mockQueries.filter((q) => q.client.startsWith('user:')).map((q) => q.client);
    expect(userClients.length).toBeGreaterThan(0);
    userClients.forEach((client) => expect(client).toBe('user:token-alice'));
  });
});
