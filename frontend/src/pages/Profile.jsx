import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'

// İdil Y.: name, email and address will be shown here.
export default function Profile() {
  return (
    <>
      <PageHeader title="My Profile" />
      <EmptyState icon="👤" title="Profile details are coming soon" text="The content of this page will be added by the teammate responsible for it. The page layout and design are ready." />
    </>
  )
}
