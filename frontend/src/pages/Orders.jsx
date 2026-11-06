import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'

// İdil S.: order history, status (processing / in-transit / delivered) and invoice will go here.
export default function Orders() {
  return (
    <>
      <PageHeader title="My Orders" />
      <EmptyState icon="📦" title="You have no orders yet" text="The content of this page will be added by the teammate responsible for it. The page layout and design are ready." />
    </>
  )
}
