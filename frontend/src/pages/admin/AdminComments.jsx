import PageHeader from '../../components/PageHeader.jsx'
import EmptyState from '../../components/EmptyState.jsx'

// Mehlika: approve / reject comments.
export default function AdminComments() {
  return (
    <>
      <PageHeader title="Review Approval" />
      <EmptyState icon="💬" title="No comments awaiting approval" text="The admin layout is ready; the content will be added in the responsible teammate's tasks." />
    </>
  )
}
