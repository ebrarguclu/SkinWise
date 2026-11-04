// Products come from the backend (see src/api/products.js).
// All prices are in US dollars (USD).
export const categories = [
  { id: 'cleanser', name: 'Cleansers', icon: '🫧' },
  { id: 'moisturizer', name: 'Moisturizers', icon: '💧' },
  { id: 'serum', name: 'Serums', icon: '✨' },
  { id: 'sunscreen', name: 'Sunscreens', icon: '☀️' },
  { id: 'mask', name: 'Masks', icon: '🌿' },
  { id: 'toner', name: 'Toners', icon: '🌸' },
]

export const formatPrice = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
