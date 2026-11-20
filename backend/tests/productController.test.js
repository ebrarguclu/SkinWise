// Gerçek Supabase yerine sahte bir nesne kullan
jest.mock('../src/config/supabaseClient', () => ({ from: jest.fn() }));

const supabase = require('../src/config/supabaseClient');
const { getAllProducts, getProductById, searchWords } = require('../src/controllers/productController');

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

// ---------- GET /products?category=... (kategoriye gore urunler) ----------

// select().eq() zincirini taklit eder: kategori filtresi eq('category', slug) ile yapilir
function mockCategoryQuery(result) {
  const eq = jest.fn().mockResolvedValue(result);
  supabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq }) });
  return eq;
}

test('GET /products?category=serum returns only the products of that category', async () => {
  const serums = [
    { id: 3, name: 'Niacinamide 10% Serum', category: 'serum' },
    { id: 7, name: 'Vitamin C Brightening Serum', category: 'serum' },
  ];
  const eq = mockCategoryQuery({ data: serums, error: null });

  const res = mockRes();
  await getAllProducts({ query: { category: 'serum' } }, res);

  expect(supabase.from).toHaveBeenCalledWith('product_catalog');
  expect(eq).toHaveBeenCalledWith('category', 'serum');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(serums);
});

test('GET /products?category= returns an empty list when the category has no products', async () => {
  mockCategoryQuery({ data: [], error: null });

  const res = mockRes();
  await getAllProducts({ query: { category: 'mask' } }, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith([]);
});

test('GET /products with an empty category returns all products without filtering', async () => {
  const allProducts = [{ id: 1 }, { id: 2 }];
  supabase.from.mockReturnValue({
    select: jest.fn().mockResolvedValue({ data: allProducts, error: null }),
  });

  const res = mockRes();
  await getAllProducts({ query: { category: '' } }, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(allProducts);
});

test('GET /products?category= returns 400 for an invalid category without querying', async () => {
  supabase.from.mockClear();

  for (const bad of ['Serum', 'serum; drop table', ['serum', 'toner']]) {
    const res = mockRes();
    await getAllProducts({ query: { category: bad } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid category' });
  }
  expect(supabase.from).not.toHaveBeenCalled();
});

test('GET /products?category=serum returns 500 when the database fails', async () => {
  mockCategoryQuery({ data: null, error: { message: 'DB down' } });

  const res = mockRes();
  await getAllProducts({ query: { category: 'serum' } }, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'DB down' });
});

// ---------- GET /products?q=...&sort=... (arama ve siralama, Sprint 2) ----------

// Zincirlenebilir sahte sorgu: select/eq/or/order cagrilarini kaydeder,
// await edilince "result" doner (gercek Supabase sorgusu gibi).
function mockChainQuery(result) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    or: jest.fn(() => query),
    order: jest.fn(() => query),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  supabase.from.mockReturnValue(query);
  return query;
}

const filterFor = (word) => `name.ilike."%${word}%",description.ilike."%${word}%",brand.ilike."%${word}%"`;

test('GET /products?q=serum searches the name, description and brand', async () => {
  const found = [{ id: 3, name: 'Niacinamide 10% Serum' }];
  const query = mockChainQuery({ data: found, error: null });

  const res = mockRes();
  await getAllProducts({ query: { q: 'serum' } }, res);

  expect(supabase.from).toHaveBeenCalledWith('product_catalog');
  expect(query.or).toHaveBeenCalledWith(filterFor('serum'));
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(found);
});

test('GET /products?q= with several words requires every word to match', async () => {
  const query = mockChainQuery({ data: [], error: null });

  await getAllProducts({ query: { q: '  Vitamin   C serum ' } }, mockRes());

  expect(query.or.mock.calls).toEqual([[filterFor('Vitamin')], [filterFor('C')], [filterFor('serum')]]);
});

test('GET /products?q= removes characters that could break the database filter', async () => {
  const query = mockChainQuery({ data: [], error: null });

  await getAllProducts({ query: { q: 'rice, (toner)"%_*' } }, mockRes());

  expect(query.or.mock.calls).toEqual([[filterFor('rice')], [filterFor('toner')]]);
});

test('GET /products?q= also finds products that are out of stock', async () => {
  const found = [{ id: 5, name: 'Clay Detox Mask', stock: 0 }, { id: 9, name: 'Kaolin Clay Mask', stock: 4 }];
  const query = mockChainQuery({ data: found, error: null });

  const res = mockRes();
  await getAllProducts({ query: { q: 'clay' } }, res);

  expect(query.eq).not.toHaveBeenCalled(); // no stock filter
  expect(res.json).toHaveBeenCalledWith(found);
});

test('GET /products with a blank or symbols-only search returns all products', async () => {
  for (const q of ['', '   ', '%%%', '(),']) {
    const query = mockChainQuery({ data: [{ id: 1 }], error: null });

    const res = mockRes();
    await getAllProducts({ query: { q } }, res);

    expect(query.or).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  }
});

test('GET /products?q= returns 400 for a too long or repeated search without querying', async () => {
  supabase.from.mockClear();

  const tooLong = mockRes();
  await getAllProducts({ query: { q: 'a'.repeat(101) } }, tooLong);
  expect(tooLong.status).toHaveBeenCalledWith(400);
  expect(tooLong.json).toHaveBeenCalledWith({ error: 'Search text must be at most 100 characters' });

  const repeated = mockRes();
  await getAllProducts({ query: { q: ['serum', 'toner'] } }, repeated);
  expect(repeated.status).toHaveBeenCalledWith(400);
  expect(repeated.json).toHaveBeenCalledWith({ error: 'Invalid search' });

  expect(supabase.from).not.toHaveBeenCalled();
});

test('GET /products?sort=price-asc sorts by price, cheapest first', async () => {
  const query = mockChainQuery({ data: [], error: null });

  await getAllProducts({ query: { sort: 'price-asc' } }, mockRes());

  expect(query.order.mock.calls).toEqual([['price', { ascending: true }], ['id', { ascending: true }]]);
});

test('GET /products?sort=price-desc sorts by price, most expensive first', async () => {
  const query = mockChainQuery({ data: [], error: null });

  await getAllProducts({ query: { sort: 'price-desc' } }, mockRes());

  expect(query.order.mock.calls).toEqual([['price', { ascending: false }], ['id', { ascending: true }]]);
});

test('GET /products?sort=popular sorts by units sold, then by rating', async () => {
  const query = mockChainQuery({ data: [], error: null });

  await getAllProducts({ query: { sort: 'popular' } }, mockRes());

  expect(query.order.mock.calls).toEqual([
    ['sold_count', { ascending: false }],
    ['rating', { ascending: false }],
    ['id', { ascending: true }],
  ]);
});

test('GET /products?sort= returns 400 for an unknown sort without querying', async () => {
  supabase.from.mockClear();

  for (const bad of ['cheapest', 'constructor', ['price-asc', 'popular']]) {
    const res = mockRes();
    await getAllProducts({ query: { sort: bad } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid sort' });
  }
  expect(supabase.from).not.toHaveBeenCalled();
});

test('GET /products sorts search results too (category + search + sort together)', async () => {
  const query = mockChainQuery({ data: [], error: null });

  const res = mockRes();
  await getAllProducts({ query: { category: 'serum', q: 'vitamin', sort: 'price-desc' } }, res);

  expect(query.eq).toHaveBeenCalledWith('category', 'serum');
  expect(query.or).toHaveBeenCalledWith(filterFor('vitamin'));
  expect(query.order).toHaveBeenCalledWith('price', { ascending: false });
  expect(res.status).toHaveBeenCalledWith(200);
});

test('GET /products?q= returns 500 when the database fails', async () => {
  mockChainQuery({ data: null, error: { message: 'DB down' } });

  const res = mockRes();
  await getAllProducts({ query: { q: 'serum', sort: 'popular' } }, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'DB down' });
});

test('searchWords keeps letters, numbers and + - . \' and at most 5 words', () => {
  expect(searchWords("SPF 50+ Paula's")).toEqual(['SPF', '50+', "Paula's"]);
  expect(searchWords('güneş kremi')).toEqual(['güneş', 'kremi']);
  expect(searchWords('Niacinamide 10% + Zinc')).toEqual(['Niacinamide', '10', 'Zinc']);
  expect(searchWords('a b c d e f g')).toEqual(['a', 'b', 'c', 'd', 'e']);
  expect(searchWords(undefined)).toEqual([]);
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

test('GET /products/:id returns 404 for zero, negative, decimal and empty ids without querying', async () => {
  supabase.from.mockClear();

  for (const bad of ['0', '-5', '1.5', '']) {
    const res = mockRes();
    await getProductById({ params: { id: bad } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
  }
  expect(supabase.from).not.toHaveBeenCalled();
});

test('GET /products/:id reads from the product_catalog view and returns all detail fields', async () => {
  const fullProduct = {
    id: 3, name: 'Niacinamide 10% Serum', category: 'serum', category_name: 'Serums',
    model: 'NS10-30', serial_number: 'SW-SE-0001', description: 'A lightweight serum.',
    price: 17.99, discount_rate: 0, final_price: 17.99, stock: 5,
    warranty_status: 'No warranty, 30-day satisfaction guarantee',
    distributor: 'PureLab Europe GmbH', image_url: null,
  };
  mockSingleResult({ data: fullProduct, error: null });

  const res = mockRes();
  await getProductById({ params: { id: '3' } }, res);

  expect(supabase.from).toHaveBeenCalledWith('product_catalog');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(fullProduct);
});

test('GET /products/:id 404 response body says "Product not found" for an unknown id', async () => {
  mockSingleResult({ data: null, error: null });

  const res = mockRes();
  await getProductById({ params: { id: '999' } }, res);

  expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
});

test('GET /products/:id returns 500 when the database fails', async () => {
  mockSingleResult({ data: null, error: { message: 'DB down' } });

  const res = mockRes();
  await getProductById({ params: { id: '3' } }, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'DB down' });
});
