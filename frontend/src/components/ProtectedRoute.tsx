import { Navigate, Outlet } from 'react-router-dom'
import { hasToken } from '@/hooks/useAuth'

export function ProtectedRoute() {
  if (!hasToken()) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
