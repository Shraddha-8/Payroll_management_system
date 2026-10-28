import { useAuth } from '../context/AuthContext'
import { Alert, Card, PageHeader, StatusBadge } from '../components/ui'

export default function Profile() {
  const { user, employeeLink } = useAuth()
  return (
    <>
      <PageHeader title="My profile" subtitle="Account information from the server" />
      <div className="stack">
        <Card>
          <dl className="dl">
            <dt>Name</dt><dd>{user.name}</dd>
            <dt>Email</dt><dd>{user.email}</dd>
            <dt>Role</dt><dd>{user.role}</dd>
            <dt>Account status</dt><dd><StatusBadge status={user.is_active ? 'Active' : 'Inactive'} /></dd>
            {user.role === 'Employee' && <><dt>Employee record</dt><dd>{employeeLink.status === 'ok' ? `#${employeeLink.id}` : employeeLink.status === 'loading' ? 'Checking…' : 'Not linked / not available'}</dd></>}
          </dl>
        </Card>
        <Alert tone="info">Profile editing and password change are not available — the backend has no endpoints for them.</Alert>
      </div>
    </>
  )
}
