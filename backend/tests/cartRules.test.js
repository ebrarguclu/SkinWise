const { toPositiveInt, addQuantity, mergeCarts } = require('../src/lib/cartRules');

describe('toPositiveInt', () => {
  test('accepts whole numbers above zero, also as text', () => {
    expect(toPositiveInt(3)).toBe(3);
    expect(toPositiveInt('7')).toBe(7);
  });

  test('rejects zero, negative, decimal and broken values', () => {
    for (const bad of [0, -1, 1.5, 'abc', null, undefined, {}]) {
      expect(toPositiveInt(bad)).toBeNull();
    }
  });
});

describe('addQuantity', () => {
  test('adds the whole amount when there is enough stock', () => {
    expect(addQuantity(1, 2, 10)).toEqual({ quantity: 3, added: 2, reason: null });
  });

  test('adds only what is left in stock', () => {
    expect(addQuantity(3, 4, 5)).toEqual({ quantity: 5, added: 2, reason: 'stock_limit' });
  });

  test('adds nothing when the whole stock is already in the cart', () => {
    expect(addQuantity(5, 1, 5)).toEqual({ quantity: 5, added: 0, reason: 'stock_limit' });
  });

  test('an out-of-stock product cannot be added', () => {
    expect(addQuantity(0, 1, 0)).toEqual({ quantity: 0, added: 0, reason: 'out_of_stock' });
  });
});

describe('mergeCarts (guest cart into saved cart after login)', () => {
  const stock = new Map([[1, 10], [2, 3], [3, 0]]);

  test('a guest product that is not saved yet is added', () => {
    const { rows, adjusted } = mergeCarts([], [{ productId: 1, quantity: 2 }], stock);
    expect(rows).toEqual([{ productId: 1, quantity: 2 }]);
    expect(adjusted).toEqual([]);
  });

  test('the same product in both carts becomes one line with the quantities added up', () => {
    const { rows } = mergeCarts([{ productId: 1, quantity: 4 }], [{ productId: 1, quantity: 3 }], stock);
    expect(rows).toEqual([{ productId: 1, quantity: 7 }]);
  });

  test('the merged quantity never goes above the stock', () => {
    const { rows, adjusted } = mergeCarts([{ productId: 2, quantity: 2 }], [{ productId: 2, quantity: 5 }], stock);
    expect(rows).toEqual([{ productId: 2, quantity: 3 }]);
    expect(adjusted).toEqual([{ productId: 2, requested: 5, quantity: 3, reason: 'stock_limit' }]);
  });

  test('out-of-stock and no-longer-sold products are reported, not saved', () => {
    const { rows, adjusted } = mergeCarts([], [{ productId: 3, quantity: 1 }, { productId: 99, quantity: 1 }], stock);
    expect(rows).toEqual([]);
    expect(adjusted).toEqual([
      { productId: 3, requested: 1, quantity: 0, reason: 'out_of_stock' },
      { productId: 99, requested: 1, quantity: 0, reason: 'unavailable' },
    ]);
  });

  test('saved lines that the guest cart does not touch are left alone', () => {
    const { rows } = mergeCarts([{ productId: 2, quantity: 1 }], [{ productId: 1, quantity: 1 }], stock);
    expect(rows).toEqual([{ productId: 1, quantity: 1 }]);
  });

  test('the same product twice in the guest cart counts once, broken lines are ignored', () => {
    const guest = [
      { productId: 1, quantity: 1 }, { productId: 1, quantity: 2 },
      { productId: 'x', quantity: 1 }, { productId: 1, quantity: 0 }, null,
    ];
    const { rows, adjusted } = mergeCarts([], guest, stock);
    expect(rows).toEqual([{ productId: 1, quantity: 3 }]);
    expect(adjusted).toEqual([]);
  });

  test('an empty guest cart changes nothing', () => {
    expect(mergeCarts([{ productId: 1, quantity: 2 }], [], stock)).toEqual({ rows: [], adjusted: [] });
  });
});
