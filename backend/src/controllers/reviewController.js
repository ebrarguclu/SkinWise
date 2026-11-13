// Uses the shared client (secret key) on purpose: reviews, orders and
// order_items have no RLS policies, so a user client cannot read them.
const supabase = require('../config/supabaseClient');

const MAX_COMMENT_LENGTH = 1000;

function serverError(res, error) {
  console.error('Review error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}

// Delivered-order check: does this user have an order with status
// 'delivered' that contains this product? Returns { delivered, error }.
async function hasDeliveredOrder(userId, productId) {
  const { data, error } = await supabase
    .from('order_items')
    .select('id, orders!inner(user_id, status)')
    .eq('product_id', productId)
    .eq('orders.user_id', userId)
    .eq('orders.status', 'delivered')
    .limit(1);
  return { delivered: Boolean(data && data.length > 0), error };
}

// POST /products/:id/reviews  body: { rating: 1-5, comment?: string }
async function createReview(req, res) {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // user_id comes only from the token, never from the body
  const userId = req.user.id;
  const { rating, comment } = req.body || {};

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5' });
  }
  if (comment !== undefined && comment !== null && typeof comment !== 'string') {
    return res.status(400).json({ error: 'Comment must be text' });
  }
  const cleanComment = typeof comment === 'string' ? comment.trim() : '';
  if (cleanComment.length > MAX_COMMENT_LENGTH) {
    return res.status(400).json({ error: `Comment must be at most ${MAX_COMMENT_LENGTH} characters` });
  }

  // 1) The product must exist (and be active)
  const { data: product, error: productError } = await supabase
    .from('product_catalog')
    .select('id')
    .eq('id', productId)
    .maybeSingle();
  if (productError) return serverError(res, productError);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  // 2) The user must have received this product
  const { delivered, error: orderError } = await hasDeliveredOrder(userId, productId);
  if (orderError) return serverError(res, orderError);
  if (!delivered) {
    return res.status(403).json({ error: 'Only customers who received this product can review it' });
  }

  // 3) Save. The rating counts at once; a comment waits for approval
  //    (comment_status uses the column default 'pending').
  const { data: review, error: insertError } = await supabase
    .from('reviews')
    .insert({
      user_id: userId,
      product_id: productId,
      rating,
      comment: cleanComment || null,
    })
    .select('id, product_id, rating, comment, comment_status')
    .single();

  if (insertError) {
    // 23505 = unique violation: one review per user per product
    if (insertError.code === '23505') {
      return res.status(409).json({ error: 'You have already reviewed this product' });
    }
    return serverError(res, insertError);
  }

  return res.status(201).json({
    id: review.id,
    productId: review.product_id,
    rating: review.rating,
    comment: review.comment,
    commentStatus: review.comment_status,
  });
}

// GET /products/:id/reviews/eligibility
// Tells the frontend whether the current user may review this product.
async function getReviewEligibility(req, res) {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // user_id comes only from the token
  const userId = req.user.id;

  const { data: product, error: productError } = await supabase
    .from('product_catalog')
    .select('id')
    .eq('id', productId)
    .maybeSingle();
  if (productError) return serverError(res, productError);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { delivered, error: orderError } = await hasDeliveredOrder(userId, productId);
  if (orderError) return serverError(res, orderError);
  if (!delivered) return res.status(200).json({ canReview: false, reason: 'not_delivered' });

  // One review per user per product
  const { data: existing, error: reviewError } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (reviewError) return serverError(res, reviewError);
  if (existing) return res.status(200).json({ canReview: false, reason: 'already_reviewed' });

  return res.status(200).json({ canReview: true, reason: null });
}

module.exports = { createReview, getReviewEligibility };
