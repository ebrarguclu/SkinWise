import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'

// Page reserved for the wishlist feature.
export default function Wishlist() {
  return (
    <>
      <PageHeader title="My Wishlist" />
      <EmptyState icon="💗" title="Your wishlist is empty" text="The content of this page will be added by the teammate responsible for it. The page layout and design are ready." />
    </>
  )
}
