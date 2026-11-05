// Gerçek Supabase yerine sahte bir nesne kullan
jest.mock('../src/config/supabaseClient', () => ({ from: jest.fn() }));

const supabase = require('../src/config/supabaseClient');
const { getAllProducts, getProductById } = require('../src/controllers/productController');

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

  expect(supabase.from).toHaveBeenCalledWith('product_catalog');
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

// select().eq().maybeSingle() zincirini taklit eder
function mockSingleResult(result) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  supabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq }) });
  return eq;
}

test('GET /products/:id returns 200 and the product', async () => {
  const fakeProduct = { id: 3, name: 'Niacinamide Serum' };
  const eq = mockSingleResult({ data: fakeProduct, error: null });

  const res = mockRes();
  await getProductById({ params: { id: '3' } }, res);

  expect(eq).toHaveBeenCalledWith('id', 3);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(fakeProduct);
});

test('GET /products/:id returns 404 when the product does not exist', async () => {
  mockSingleResult({ data: null, error: null });

  const res = mockRes();
  await getProductById({ params: { id: '999' } }, res);

  expect(res.status).toHaveBeenCalledWith(404);
});

test('GET /products/:id returns 404 for a non-numeric id without querying', async () => {
  supabase.from.mockClear();

  const res = mockRes();
  await getProductById({ params: { id: 'abc' } }, res);

  expect(supabase.from).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(404);
});

test('GET /products/:id returns 500 when the database fails', async () => {
  mockSingleResult({ data: null, error: { message: 'DB down' } });

  const res = mockRes();
  await getProductById({ params: { id: '3' } }, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'DB down' });
});
