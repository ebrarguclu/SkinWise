// Saved cart of a logged-in user (Jira DP-14, Sprint 2), kept in cart_items.
// POST /orders (orderController) turns this cart into an order.
//
// Like orderController, this uses the shared client (secret key) on purpose:
// cart_items has no RLS policies for users. That is safe only because user_id
// always comes from the verified token (req.user.id), never from the request body.
const supabase = require('../config/supabaseClient');
const { MAX_ITEMS_PER_REQUEST, toPositiveInt, addQuantity, mergeCarts } = require('../lib/cartRules');

function serverError(res, error) {
  console.error('Cart error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}

// Products that are still on sale, with the price a customer pays now.
async function readProducts(ids) {
  if (ids.length === 0) return { products: new Map() };
  const { data, error } = await supabase
    .from('product_catalog')
    .select('id, name, emoji, image_url, final_price, stock')
    .in('id', ids);
  if (error) return { error };
  return { products: new Map((data || []).map((p) => [p.id, p])) };
}

async function readCartRows(userId) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .eq('user_id', userId);
  if (error) return { error };
  return { rows: (data || []).map((r) => ({ productId: r.product_id, quantity: r.quantity })) };
}

// The cart as the frontend shows it. Products taken off sale are left out.
async function readCart(userId) {
  const cart = await readCartRows(userId);
  if (cart.error) return cart;
  const { products, error } = await readProducts(cart.rows.map((r) => r.productId));
  if (error) return { error };

  const items = cart.rows
    .filter((r) => products.has(r.productId))
    .map((r) => {
      const p = products.get(r.productId);
      return {
        productId: p.id,
        name: p.name,
        emoji: p.emoji,
        imageUrl: p.image_url,
        price: Number(p.final_price),
        stock: p.stock,
        quantity: r.quantity,
      };
    });
  return { items };
}

async function saveRows(userId, rows) {
  if (rows.length === 0) return {};
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('cart_items')
    .upsert(
      rows.map((r) => ({ user_id: userId, product_id: r.productId, quantity: r.quantity, updated_at: now })),
      { onConflict: 'user_id,product_id' }
    );
  return { error };
}

// GET /cart -> { items: [{ productId, name, emoji, imageUrl, price, stock, quantity }] }
async function getCart(req, res) {
  const { items, error } = await readCart(req.user.id);
  if (error) return serverError(res, error);
  return res.status(200).json({ items });
}

// POST /cart   body: { productId, quantity = 1 }
// Adding a product that is already in the cart increases its quantity.
async function addToCart(req, res) {
  const userId = req.user.id;
  const productId = toPositiveInt(req.body && req.body.productId);
  const quantity = req.body && req.body.quantity !== undefined ? toPositiveInt(req.body.quantity) : 1;
  if (!productId || !quantity) {
    return res.status(400).json({ error: 'productId and a quantity above zero are required' });
  }

  const { products, error: productError } = await readProducts([productId]);
  if (productError) return serverError(res, productError);
  const product = products.get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { data: line, error: lineError } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (lineError) return serverError(res, lineError);

  const result = addQuantity(line ? line.quantity : 0, quantity, product.stock);
  if (result.added === 0) {
    const error = result.reason === 'out_of_stock'
      ? `${product.name} is out of stock`
      : `You already have all ${product.stock} in your cart`;
    return res.status(409).json({ error, reason: result.reason, available: product.stock });
  }

  const { error: saveError } = await saveRows(userId, [{ productId, quantity: result.quantity }]);
  if (saveError) return serverError(res, saveError);

  const { items, error } = await readCart(userId);
  if (error) return serverError(res, error);
  return res.status(200).json({ items, added: result.added, reason: result.reason });
}

// PATCH /cart/:productId   body: { quantity }
// Sets the quantity of a product that is already in the cart, never above the stock.
async function updateCartItem(req, res) {
  const userId = req.user.id;
  const productId = toPositiveInt(req.params.productId);
  const quantity = toPositiveInt(req.body && req.body.quantity);
  if (!productId) return res.status(400).json({ error: 'Invalid product id' });
  if (!quantity) {
    return res.status(400).json({ error: 'Quantity must be at least 1. Use DELETE to remove a product' });
  }

  const { data: line, error: lineError } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (lineError) return serverError(res, lineError);
  if (!line) return res.status(404).json({ error: 'This product is not in your cart' });

  const { products, error: productError } = await readProducts([productId]);
  if (productError) return serverError(res, productError);
  const product = products.get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!(product.stock > 0)) {
    return res.status(409).json({ error: `${product.name} is out of stock`, reason: 'out_of_stock', available: 0 });
  }

  const saved = Math.min(quantity, product.stock);
  const { error: saveError } = await saveRows(userId, [{ productId, quantity: saved }]);
  if (saveError) return serverError(res, saveError);

  const { items, error } = await readCart(userId);
  if (error) return serverError(res, error);
  return res.status(200).json({ items, quantity: saved, reason: saved < quantity ? 'stock_limit' : null });
}

// DELETE /cart/:productId -> removes the product from the cart
async function removeCartItem(req, res) {
  const userId = req.user.id;
  const productId = toPositiveInt(req.params.productId);
  if (!productId) return res.status(400).json({ error: 'Invalid product id' });

  const { error: deleteError } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (deleteError) return serverError(res, deleteError);

  const { items, error } = await readCart(userId);
  if (error) return serverError(res, error);
  return res.status(200).json({ items });
}

// POST /cart/merge   body: { items: [{ productId, quantity }] }
// Called right after login with the guest cart from the browser (requirement 4:
// "Upon logging in, any products previously added to their cart should be retained").
async function mergeCart(req, res) {
  const userId = req.user.id;
  const guestItems = req.body && req.body.items;
  if (!Array.isArray(guestItems)) return res.status(400).json({ error: 'items must be a list' });
  if (guestItems.length > MAX_ITEMS_PER_REQUEST) {
    return res.status(400).json({ error: `A cart can have at most ${MAX_ITEMS_PER_REQUEST} products` });
  }

  const saved = await readCartRows(userId);
  if (saved.error) return serverError(res, saved.error);

  const ids = [...new Set(guestItems.map((i) => toPositiveInt(i && i.productId)).filter(Boolean))];
  const { products, error: productError } = await readProducts(ids);
  if (productError) return serverError(res, productError);
  const stockById = new Map([...products.values()].map((p) => [p.id, p.stock]));

  const { rows, adjusted } = mergeCarts(saved.rows, guestItems, stockById);
  const { error: saveError } = await saveRows(userId, rows);
  if (saveError) return serverError(res, saveError);

  const { items, error } = await readCart(userId);
  if (error) return serverError(res, error);
  return res.status(200).json({ items, adjusted });
}

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, mergeCart };
