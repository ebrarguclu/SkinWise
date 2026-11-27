// Cart rules for logged-in users (Jira DP-14, Sprint 2).
// Pure functions: no database here, so every rule can be unit tested on its own.

const MAX_ITEMS_PER_REQUEST = 100;

// A product id or quantity must be a whole number above zero.
function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Adds `adding` pieces to a cart line that already has `inCart`, never above the stock.
// Returns { quantity, added, reason }:
//   quantity = the new quantity of the line
//   added    = how many were really added (can be less than asked)
//   reason   = null | 'out_of_stock' | 'stock_limit'
function addQuantity(inCart, adding, stock) {
  if (!(stock > 0)) return { quantity: inCart, added: 0, reason: 'out_of_stock' };
  const room = Math.max(stock - inCart, 0);
  const added = Math.min(adding, room);
  return {
    quantity: inCart + added,
    added,
    reason: added < adding ? 'stock_limit' : null,
  };
}

// Merges the guest cart (kept in the browser) into the saved cart after login.
//   serverItems: [{ productId, quantity }]  what cart_items already holds
//   guestItems:  [{ productId, quantity }]  what the browser sends
//   stockById:   Map productId -> stock      only products still on sale
// Returns:
//   rows:     [{ productId, quantity }]  lines to save (only the ones that change)
//   adjusted: [{ productId, requested, quantity, reason }]  lines we could not take in full
function mergeCarts(serverItems, guestItems, stockById) {
  const saved = new Map(serverItems.map((i) => [i.productId, i.quantity]));

  // The same product twice in the guest cart counts as one line.
  const guest = new Map();
  for (const item of guestItems) {
    const productId = toPositiveInt(item && item.productId);
    const quantity = toPositiveInt(item && item.quantity);
    if (productId && quantity) guest.set(productId, (guest.get(productId) || 0) + quantity);
  }

  const rows = [];
  const adjusted = [];
  for (const [productId, requested] of guest) {
    if (!stockById.has(productId)) {
      adjusted.push({ productId, requested, quantity: 0, reason: 'unavailable' });
      continue;
    }
    const inCart = saved.get(productId) || 0;
    const result = addQuantity(inCart, requested, stockById.get(productId));
    if (result.added > 0) rows.push({ productId, quantity: result.quantity });
    if (result.reason) adjusted.push({ productId, requested, quantity: result.quantity, reason: result.reason });
  }
  return { rows, adjusted };
}

module.exports = { MAX_ITEMS_PER_REQUEST, toPositiveInt, addQuantity, mergeCarts };
