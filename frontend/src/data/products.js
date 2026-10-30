// MOCK DATA – once the backend is ready, replace these functions with Supabase calls.
// All prices are in US dollars (USD).
export const categories = [
  { id: 'cleanser', name: 'Cleansers', icon: '🫧' },
  { id: 'moisturizer', name: 'Moisturizers', icon: '💧' },
  { id: 'serum', name: 'Serums', icon: '✨' },
  { id: 'sunscreen', name: 'Sunscreens', icon: '☀️' },
  { id: 'mask', name: 'Masks', icon: '🌿' },
  { id: 'toner', name: 'Toners', icon: '🌸' },
]

export const products = [
  { id: 1, name: 'Gentle Foam Cleanser', brand: 'SkinWise Lab', category: 'cleanser', price: 12.99, stock: 24, rating: 4.6, skin: 'Sensitive', badges: ['Vegan', 'Fragrance-free'], emoji: '🫧' },
  { id: 2, name: 'Hyaluron Barrier Cream', brand: 'Dermia', category: 'moisturizer', price: 19.99, stock: 12, rating: 4.8, skin: 'Dry', badges: ['Fragrance-free'], emoji: '💧' },
  { id: 3, name: 'Niacinamide 10% Serum', brand: 'PureLab', category: 'serum', price: 17.99, stock: 5, rating: 4.5, skin: 'Combination', badges: ['Vegan'], emoji: '✨' },
  { id: 4, name: 'Daily SPF 50 Fluid', brand: 'Sunly', category: 'sunscreen', price: 15.99, stock: 40, rating: 4.7, skin: 'Oily', badges: ['Lightweight'], emoji: '☀️' },
  { id: 5, name: 'Clay Detox Mask', brand: 'Verde', category: 'mask', price: 9.99, stock: 0, rating: 4.2, skin: 'Oily', badges: ['Vegan'], emoji: '🌿' },
  { id: 6, name: 'Rose Calming Toner', brand: 'Petal', category: 'toner', price: 11.49, stock: 18, rating: 4.4, skin: 'Sensitive', badges: ['Alcohol-free'], emoji: '🌸' },
  { id: 7, name: 'Vitamin C Brightening Serum', brand: 'PureLab', category: 'serum', price: 21.99, stock: 9, rating: 4.6, skin: 'Normal', badges: ['Dark-spot care'], emoji: '🍊' },
  { id: 8, name: 'Ceramide Night Cream', brand: 'Dermia', category: 'moisturizer', price: 23.99, stock: 7, rating: 4.9, skin: 'Dry', badges: ['Fragrance-free', 'Vegan'], emoji: '🌙' },
]

export const getProducts = () => products
export const getProduct = (id) => products.find((p) => p.id === Number(id))
export const formatPrice = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
