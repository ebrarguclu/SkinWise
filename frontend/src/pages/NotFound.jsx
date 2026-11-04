import EmptyState from '../components/EmptyState.jsx'
export default function NotFound() {
  return <EmptyState icon="🧭" title="Page not found" text="The page you are looking for may have moved or never existed." actionLabel="Back to home" actionTo="/" />
}
