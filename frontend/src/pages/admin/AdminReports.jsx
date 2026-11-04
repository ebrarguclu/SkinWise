import PageHeader from '../../components/PageHeader.jsx'
import EmptyState from '../../components/EmptyState.jsx'

// Sales Manager: discounts, invoices, revenue/profit chart.
export default function AdminReports() {
  return (
    <>
      <PageHeader title="Revenue & Pricing" />
      <EmptyState icon="💰" title="Reports coming soon" text="The admin layout is ready; the content will be added in the responsible teammate's tasks." />
    </>
  )
}
