// Fake shared client instead of the real database
jest.mock('../src/config/supabaseClient', () => ({ from: jest.fn() }));

const supabase = require('../src/config/supabaseClient');
const { createOrder } = require('../src/controllers/orderController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const serum = { id: 3, name: 'Vitamin C 15% Serum', final_price: 22.99, stock: 20 };
const cream = { id: 7, name: 'Rich Barrier Cream', final_price: 16.99, stock: 5 };

const savedOrder = (over = {}) => ({
  id: 41, status: 'processing', total_amount: 62.97, delivery_address: 'Tuzla, Istanbul',
  created_at: '2026-11-17T18:00:00Z', ...over,
});

// Fakes every query by table name. Each argument is the result of one query.
function mockDb({ cart = { data: [{ product_id: 3, quantity: 2 }, { product_id: 7, quantity: 1 }], error: null },
                  products = { data: [serum, cream], error: null },
                  profile = { data: { address: 'Tuzla, Istanbul' }, error: null },
                  order = { data: savedOrder(), error: null },
                  items = { error: null },
                  clear = { error: null } } = {}) {
  const calls = {
    cartSelect: jest.fn(), productsIn: jest.fn(), orderInsert: jest.fn(),
    itemsInsert: jest.fn(), cartDelete: jest.fn(), orderDelete: jest.fn(), profileRead: jest.fn(),
  };

  supabase.from.mockImplementation((table) => {
    if (table === 'cart_items') {
      return {
        select: () => ({ eq: (...args) => { calls.cartSelect(...args); return Promise.resolve(cart); } }),
        delete: () => ({ eq: (...args) => { calls.cartDelete(...args); return Promise.resolve(clear); } }),
      };
    }
    if (table === 'product_catalog') {
      return { select: () => ({ in: (...args) => { calls.productsIn(...args); return Promise.resolve(products); } }) };
    }
    if (table === 'profiles') {
      return {
        select: () => ({ eq: (...args) => { calls.profileRead(...args); return { maybeSingle: () => Promise.resolve(profile) }; } }),
      };
    }
    if (table === 'orders') {
      return {
        insert: (row) => { calls.orderInsert(row); return { select: () => ({ single: () => Promise.resolve(order) }) }; },
        delete: () => ({ eq: (...args) => { calls.orderDelete(...args); return Promise.resolve({ error: null }); } }),
      };
    }
    if (table === 'order_items') {
      return { insert: (rows) => { calls.itemsInsert(rows); return Promise.resolve(items); } };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return calls;
}

const req = (body = {}) => ({ user: { id: 'user-1' }, body });

beforeEach(() => {
  supabase.from.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('POST /orders', () => {
  test('creates a processing order from the cart (201)', async () => {
    mockDb();
    const res = mockRes();
    await createOrder(req(), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 41,
      status: 'processing',
      totalAmount: 62.97,
      deliveryAddress: 'Tuzla, Istanbul',
      createdAt: '2026-11-17T18:00:00Z',
      items: [
        { productId: 3, name: 'Vitamin C 15% Serum', quantity: 2, unitPrice: 22.99 },
        { productId: 7, name: 'Rich Barrier Cream', quantity: 1, unitPrice: 16.99 },
      ],
    });
  });

  test('reads only the cart of the logged-in user', async () => {
    const calls = mockDb();
    await createOrder(req({ userId: 'someone-else' }), mockRes());

    expect(calls.cartSelect).toHaveBeenCalledWith('user_id', 'user-1');
    expect(calls.orderInsert.mock.calls[0][0].user_id).toBe('user-1');
  });

  test('saves every item with the price paid (final_price, discount included)', async () => {
    const calls = mockDb({ products: { data: [{ ...serum, final_price: 18.39 }, cream], error: null } });
    await createOrder(req(), mockRes());

    expect(calls.itemsInsert).toHaveBeenCalledWith([
      { order_id: 41, product_id: 3, quantity: 2, unit_price: 18.39 },
      { order_id: 41, product_id: 7, quantity: 1, unit_price: 16.99 },
    ]);
  });

  test('calculates the total without rounding errors', async () => {
    const calls = mockDb({
      cart: { data: [{ product_id: 3, quantity: 3 }], error: null },
      products: { data: [{ ...serum, final_price: 0.1 }], error: null },
    });
    await createOrder(req(), mockRes());

    expect(calls.orderInsert.mock.calls[0][0].total_amount).toBe(0.3);
  });

  test('never sets the status itself (the column default "processing" is used)', async () => {
    const calls = mockDb();
    await createOrder(req({ status: 'delivered' }), mockRes());

    expect(calls.orderInsert.mock.calls[0][0]).not.toHaveProperty('status');
  });

  test('empties the cart after the order is created', async () => {
    const calls = mockDb();
    await createOrder(req(), mockRes());

    expect(calls.cartDelete).toHaveBeenCalledWith('user_id', 'user-1');
  });

  test('returns 400 for an empty cart and creates nothing', async () => {
    const calls = mockDb({ cart: { data: [], error: null } });
    const res = mockRes();
    await createOrder(req(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Your cart is empty' });
    expect(calls.orderInsert).not.toHaveBeenCalled();
  });

  test('returns 409 when the cart has more than the stock, and creates nothing', async () => {
    const calls = mockDb({ cart: { data: [{ product_id: 7, quantity: 6 }], error: null } });
    const res = mockRes();
    await createOrder(req(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Only 5 of "Rich Barrier Cream" left in stock', productId: 7, available: 5,
    });
    expect(calls.orderInsert).not.toHaveBeenCalled();
  });

  test('returns 409 for a sold-out product', async () => {
    mockDb({
      cart: { data: [{ product_id: 7, quantity: 1 }], error: null },
      products: { data: [{ ...cream, stock: 0 }], error: null },
    });
    const res = mockRes();
    await createOrder(req(), res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('returns 400 when a product in the cart no longer exists', async () => {
    const calls = mockDb({ products: { data: [serum], error: null } });
    const res = mockRes();
    await createOrder(req(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'A product in your cart is no longer available', productId: 7 });
    expect(calls.orderInsert).not.toHaveBeenCalled();
  });

  test('uses the address sent with the order instead of the profile address', async () => {
    const calls = mockDb();
    await createOrder(req({ deliveryAddress: '  Kadikoy, Istanbul  ' }), mockRes());

    expect(calls.orderInsert.mock.calls[0][0].delivery_address).toBe('Kadikoy, Istanbul');
    expect(calls.profileRead).not.toHaveBeenCalled();
  });

  test('falls back to the profile address when none is sent', async () => {
    const calls = mockDb();
    await createOrder(req(), mockRes());

    expect(calls.profileRead).toHaveBeenCalledWith('id', 'user-1');
    expect(calls.orderInsert.mock.calls[0][0].delivery_address).toBe('Tuzla, Istanbul');
  });

  test('returns 400 when there is no delivery address at all', async () => {
    const calls = mockDb({ profile: { data: { address: '' }, error: null } });
    const res = mockRes();
    await createOrder(req(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Please add a delivery address' });
    expect(calls.orderInsert).not.toHaveBeenCalled();
  });

  test('returns 400 when the delivery address is not text', async () => {
    const res = mockRes();
    await createOrder(req({ deliveryAddress: 42 }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('removes the order again if its items cannot be saved (500)', async () => {
    const calls = mockDb({ items: { error: { message: 'insert failed' } } });
    const res = mockRes();
    await createOrder(req(), res);

    expect(calls.orderDelete).toHaveBeenCalledWith('id', 41);
    expect(calls.cartDelete).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('still returns 201 if only emptying the cart fails', async () => {
    mockDb({ clear: { error: { message: 'delete failed' } } });
    const res = mockRes();
    await createOrder(req(), res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('returns 500 when the cart cannot be read', async () => {
    mockDb({ cart: { data: null, error: { message: 'DB down' } } });
    const res = mockRes();
    await createOrder(req(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
