import PageHeader from '../../components/PageHeader.jsx'
import EmptyState from '../../components/EmptyState.jsx'

// Product Manager: add/remove products, stock management.
export default function AdminProducts() {
  return (
    <>
      <PageHeader title="Products & Stock" />
      <EmptyState icon="📦" title="Product list coming soon" text="The admin layout is ready; the content will be added in the responsible teammate's tasks." />
    </>
  )
}
