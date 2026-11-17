// Uses the shared client (secret key) on purpose: orders, order_items and
// cart_items have no RLS policies for users, so a user client cannot write them.
const supabase = require('../config/supabaseClient');

function serverError(res, error) {
  console.error('Order error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}

// Money is added up in kuruş/cents so 0.1 + 0.2 style rounding errors cannot happen.
const toCents = (value) => Math.round(Number(value) * 100);
const fromCents = (cents) => cents / 100;

// POST /orders   body: { deliveryAddress?: string }
// Turns the logged-in user's cart (cart_items) into an order:
// - every item is saved with the price paid now (final_price, discount included)
// - the order starts as 'processing'
// - the cart is emptied afterwards
// Stock is NOT decreased here; that happens when the payment is confirmed (Sprint 3).
async function createOrder(req, res) {
  // user_id comes only from the token, never from the body
  const userId = req.user.id;
  const { deliveryAddress } = req.body || {};

  if (deliveryAddress !== undefined && deliveryAddress !== null && typeof deliveryAddress !== 'string') {
    return res.status(400).json({ error: 'Delivery address must be text' });
  }

  // 1) Read the cart
  const { data: cart, error: cartError } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .eq('user_id', userId);
  if (cartError) return serverError(res, cartError);
  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' });
  }

  // 2) Read the current price and stock of every product in the cart
  const productIds = cart.map((item) => item.product_id);
  const { data: products, error: productError } = await supabase
    .from('product_catalog')
    .select('id, name, final_price, stock')
    .in('id', productIds);
  if (productError) return serverError(res, productError);

  const productById = new Map((products || []).map((p) => [p.id, p]));
  const lines = [];
  for (const item of cart) {
    const product = productById.get(item.product_id);
    if (!product) {
      return res.status(400).json({ error: 'A product in your cart is no longer available', productId: item.product_id });
    }
    if (item.quantity > product.stock) {
      return res.status(409).json({
        error: `Only ${product.stock} of "${product.name}" left in stock`,
        productId: product.id,
        available: product.stock,
      });
    }
    lines.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPriceCents: toCents(product.final_price),
    });
  }

  // 3) Delivery address: the one sent with the order, otherwise the profile address
  let address = typeof deliveryAddress === 'string' ? deliveryAddress.trim() : '';
  if (!address) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('address')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) return serverError(res, profileError);
    address = (profile && profile.address ? profile.address : '').trim();
  }
  if (!address) {
    return res.status(400).json({ error: 'Please add a delivery address' });
  }

  const totalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);

  // 4) Create the order. status is not sent: the column default 'processing' is used.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ user_id: userId, total_amount: fromCents(totalCents), delivery_address: address })
    .select('id, status, total_amount, delivery_address, created_at')
    .single();
  if (orderError) return serverError(res, orderError);

  // 5) Save the items with the price paid
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(lines.map((line) => ({
      order_id: order.id,
      product_id: line.productId,
      quantity: line.quantity,
      unit_price: fromCents(line.unitPriceCents),
    })));
  if (itemsError) {
    // Do not leave an order without items behind
    await supabase.from('orders').delete().eq('id', order.id);
    return serverError(res, itemsError);
  }

  // 6) Empty the cart. The order already exists, so a failure here is only logged.
  const { error: clearError } = await supabase.from('cart_items').delete().eq('user_id', userId);
  if (clearError) console.error('Order created but the cart could not be emptied:', clearError);

  return res.status(201).json({
    id: order.id,
    status: order.status,
    totalAmount: Number(order.total_amount),
    deliveryAddress: order.delivery_address,
    createdAt: order.created_at,
    items: lines.map((line) => ({
      productId: line.productId,
      name: line.name,
      quantity: line.quantity,
      unitPrice: fromCents(line.unitPriceCents),
    })),
  });
}

module.exports = { createOrder };
