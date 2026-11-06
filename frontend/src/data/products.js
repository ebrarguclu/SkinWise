// Products and categories come from the backend (see src/api).
// All prices are in US dollars (USD).
export const formatPrice = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
