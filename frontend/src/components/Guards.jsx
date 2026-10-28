import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingState } from './ui'
import Icon from './Icon'

export function ProtectedRoute({ children }) {
  const { user, booting } = useAuth()
  const loc = useLocation()
  if (booting) return <div className="fullpage"><LoadingState text="Signing you in…" /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return children
}

/** UX-only gate. The backend enforces the real authorization on every request. */
export function RoleGuard({ roles, children }) {
  const { role } = useAuth()
  if (!roles.includes(role)) {
    return (
      <div className="state"><Icon name="shield" size={36} /><h4>Access restricted</h4>
        <p>Your role ({role}) does not have access to this page.</p></div>
    )
  }
  return children
}
