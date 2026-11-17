// Fake shared client instead of the real database
jest.mock('../src/config/supabaseClient', () => ({ from: jest.fn() }));

const supabase = require('../src/config/supabaseClient');
const { getMyOrders } = require('../src/controllers/orderController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const row = (over = {}) => ({
  id: 41,
  status: 'processing',
  total_amount: '62.97',
  delivery_address: 'Tuzla, Istanbul',
  created_at: '2026-11-17T18:00:00Z',
  order_items: [
    { product_id: 3, quantity: 2, unit_price: '22.99',
      products: { name: 'Vitamin C 15% Serum', image_url: 'https://img/serum.jpg', emoji: '✨' } },
    { product_id: 7, quantity: 1, unit_price: '16.99',
      products: { name: 'Rich Barrier Cream', image_url: null, emoji: '💧' } },
  ],
  ...over,
});

// Fakes: from('orders').select(...).eq('user_id', id).order('created_at', {...})
function mockDb(result = { data: [row()], error: null }) {
  const calls = { select: jest.fn(), eq: jest.fn(), order: jest.fn() };
  supabase.from.mockImplementation((table) => {
    if (table !== 'orders') throw new Error(`unexpected table ${table}`);
    const chain = {
      select: (...args) => { calls.select(...args); return chain; },
      eq: (...args) => { calls.eq(...args); return chain; },
      order: (...args) => { calls.order(...args); return Promise.resolve(result); },
    };
    return chain;
  });
  return calls;
}

const req = () => ({ user: { id: 'user-1' }, query: { userId: 'someone-else' } });

beforeEach(() => {
  supabase.from.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('GET /orders', () => {
  test('returns the orders with date, items and total (200)', async () => {
    mockDb();
    const res = mockRes();
    await getMyOrders(req(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{
      id: 41,
      status: 'processing',
      totalAmount: 62.97,
      deliveryAddress: 'Tuzla, Istanbul',
      createdAt: '2026-11-17T18:00:00Z',
      items: [
        { productId: 3, name: 'Vitamin C 15% Serum', imageUrl: 'https://img/serum.jpg', emoji: '✨', quantity: 2, unitPrice: 22.99 },
        { productId: 7, name: 'Rich Barrier Cream', imageUrl: null, emoji: '💧', quantity: 1, unitPrice: 16.99 },
      ],
    }]);
  });

  test('only reads the orders of the logged-in user (never from the query)', async () => {
    const calls = mockDb();
    await getMyOrders(req(), mockRes());

    expect(calls.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(calls.eq).toHaveBeenCalledTimes(1);
  });

  test('asks the database for the newest orders first', async () => {
    const calls = mockDb();
    await getMyOrders(req(), mockRes());

    expect(calls.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  test('reads the items with the price paid, not the current product price', async () => {
    const calls = mockDb();
    await getMyOrders(req(), mockRes());

    const columns = calls.select.mock.calls[0][0];
    expect(columns).toContain('order_items(product_id, quantity, unit_price');
    expect(columns).not.toContain('final_price');
  });

  test('returns an empty list when the user has no orders', async () => {
    mockDb({ data: [], error: null });
    const res = mockRes();
    await getMyOrders(req(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test('still shows an item whose product was removed', async () => {
    mockDb({ data: [row({ order_items: [{ product_id: 9, quantity: 1, unit_price: '5.00', products: null }] })], error: null });
    const res = mockRes();
    await getMyOrders(req(), res);

    expect(res.json.mock.calls[0][0][0].items).toEqual([
      { productId: 9, name: 'Product no longer available', imageUrl: null, emoji: null, quantity: 1, unitPrice: 5 },
    ]);
  });

  test('returns 500 when the database fails', async () => {
    mockDb({ data: null, error: { message: 'DB down' } });
    const res = mockRes();
    await getMyOrders(req(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
