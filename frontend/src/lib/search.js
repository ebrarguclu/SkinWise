// Texts for the search results page (Jira: Safiye, Catalog & Search, Sprint 2).

// resultsText(1)               -> '1 product found'
// resultsText(3, 'rice')       -> '3 products found for “rice”'
// resultsText(2, 'rice', 'Toners') -> '2 products found for “rice” in Toners'
export function resultsText(count, q = '', categoryName = '') {
  let text = `${count} ${count === 1 ? 'product' : 'products'} found`
  if (q.trim()) text += ` for “${q.trim()}”`
  if (q.trim() && categoryName) text += ` in ${categoryName}`
  return text
}

// Sort options shown on the product list and search pages; the values match the backend's ?sort=
export const SORT_OPTIONS = [
  { value: '', label: 'Sort by' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most popular' },
]
