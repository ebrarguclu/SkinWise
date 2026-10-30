import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'

// Fethiye: the card details form and mock bank will go here.
export default function Checkout() {
  return (
    <>
      <PageHeader title="Checkout" />
      <EmptyState icon="💳" title="Checkout is coming soon" text="The content of this page will be added by the teammate responsible for it. The page layout and design are ready." />
    </>
  )
}
