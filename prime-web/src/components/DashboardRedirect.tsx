import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

export function DashboardRedirect() {
  const role = useAuthStore((s) => s.user?.role)
  const location = useLocation()

  if (!role) return <Navigate to="/login" replace state={{ from: location }} />

  switch (role) {
    case 'Admin':
      return <Navigate to="/dashboard/admin" replace />
    case 'Manager':
      return <Navigate to="/dashboard/manager" replace />
    case 'User':
    default:
      return <Navigate to="/dashboard/user" replace />
  }
}