// Gerçek Supabase yerine sahte bir nesne kullan
jest.mock('../src/config/supabaseClient', () => ({ from: jest.fn() }));

const supabase = require('../src/config/supabaseClient');
const { getAllProducts } = require('../src/controllers/productController');

// Sahte "res" nesnesi: status ve json çağrılarını kaydeder
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

test('GET /products returns 200 and the product list', async () => {
  const fakeProducts = [{ id: 1, name: 'Niacinamide Serum' }];
  supabase.from.mockReturnValue({
    select: jest.fn().mockResolvedValue({ data: fakeProducts, error: null }),
  });

  const res = mockRes();
  await getAllProducts({}, res);

  expect(supabase.from).toHaveBeenCalledWith('products');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(fakeProducts);
});

test('GET /products returns 500 when the database fails', async () => {
  supabase.from.mockReturnValue({
    select: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }),
  });

  const res = mockRes();
  await getAllProducts({}, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'DB down' });
});
