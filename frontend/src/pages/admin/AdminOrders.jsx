import PageHeader from '../../components/PageHeader.jsx'
import EmptyState from '../../components/EmptyState.jsx'

// Mehlika: delivery list and order status updates.
export default function AdminOrders() {
  return (
    <>
      <PageHeader title="Deliveries" />
      <EmptyState icon="🚚" title="Delivery list coming soon" text="The admin layout is ready; the content will be added in the responsible teammate's tasks." />
    </>
  )
}
