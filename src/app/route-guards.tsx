import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Role } from '@/lib/types'
import { currentAccount, roleHome, useAppState } from '@/lib/store'

export function RequireAuth({ children }: { children: ReactNode }) {
  const state = useAppState()
  const account = currentAccount(state)
  const location = useLocation()
  if (!account) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

export function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const state = useAppState()
  const account = currentAccount(state)
  if (!account) return <Navigate to="/login" replace />
  if (!roles.includes(account.role)) {
    return <Navigate to={roleHome(account.role)} replace />
  }
  return <>{children}</>
}

export function HomeRedirect() {
  const state = useAppState()
  const account = currentAccount(state)
  return <Navigate to={account ? roleHome(account.role) : '/login'} replace />
}
