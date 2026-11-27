// Rules for the toast list (pure, so they are easy to unit test).
export const MAX_TOASTS = 3

// Adds a toast to the list.
// - The same message shown again replaces the old one instead of stacking up
//   (clicking "Add to cart" five times used to show five boxes).
// - At most MAX_TOASTS are shown; the oldest goes first.
export function addToast(list, toast, max = MAX_TOASTS) {
  const others = list.filter((t) => !(t.type === toast.type && t.message === toast.message))
  return [...others, toast].slice(-max)
}
