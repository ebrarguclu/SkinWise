// Gercek Supabase yerine sahte bir nesne kullan
jest.mock('../src/config/supabaseClient', () => ({ from: jest.fn() }));

const supabase = require('../src/config/supabaseClient');
const { getAllCategories } = require('../src/controllers/categoryController');

// Sahte "res" nesnesi: status ve json cagrilarini kaydeder
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// select().order() zincirini taklit eder
function mockCategoriesQuery(result) {
  const order = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ order });
  supabase.from.mockReturnValue({ select });
  return { select, order };
}

beforeEach(() => supabase.from.mockReset());

test('GET /categories returns 200 and all categories', async () => {
  const fakeCategories = [
    { id: 1, name: 'Cleansers', slug: 'cleanser', icon: '🫧' },
    { id: 2, name: 'Serums', slug: 'serum', icon: '✨' },
  ];
  mockCategoriesQuery({ data: fakeCategories, error: null });

  const res = mockRes();
  await getAllCategories({}, res);

  expect(supabase.from).toHaveBeenCalledWith('categories');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(fakeCategories);
});

test('GET /categories asks only for id, name, slug and icon, ordered by id', async () => {
  const { select, order } = mockCategoriesQuery({ data: [], error: null });

  await getAllCategories({}, mockRes());

  expect(select).toHaveBeenCalledWith('id, name, slug, icon');
  expect(order).toHaveBeenCalledWith('id');
});

test('GET /categories returns an empty list when there are no categories', async () => {
  mockCategoriesQuery({ data: [], error: null });

  const res = mockRes();
  await getAllCategories({}, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith([]);
});

test('GET /categories returns an empty list when the database sends null', async () => {
  mockCategoriesQuery({ data: null, error: null });

  const res = mockRes();
  await getAllCategories({}, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith([]);
});

test('GET /categories returns 500 with the error message when the database fails', async () => {
  mockCategoriesQuery({ data: null, error: { message: 'DB down' } });

  const res = mockRes();
  await getAllCategories({}, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'DB down' });
});
