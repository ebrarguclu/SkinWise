import { useAuth } from '../context/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'

export default function Profile() {
  const { user } = useAuth()
  return (
    <>
      <PageHeader title="My Profile" />
      <div className="card pad auth">
        <div><small className="muted block">Full name</small>{user.name}</div>
        <div><small className="muted block">Email</small>{user.email}</div>
        <div><small className="muted block">Home address</small>{user.address}</div>
      </div>
    </>
  )
}
