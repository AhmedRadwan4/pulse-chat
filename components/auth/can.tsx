'use client'

import type { Action } from '@/lib/permissions'
import { useCan } from './permissions-provider'

interface CanProps {
  action: Action
  subject: string
  children: React.ReactNode
  /** Rendered when permission is denied. Defaults to null (renders nothing). */
  fallback?: React.ReactNode
}

/**
 * Renders children only if the current user has the given permission.
 *
 * @example
 * <Can action="read" subject="users">
 *   <UsersTable />
 * </Can>
 *
 * <Can action="delete" subject="wallet" fallback={<DisabledButton />}>
 *   <DeleteButton />
 * </Can>
 */
export function Can({ action, subject, children, fallback = null }: CanProps) {
  const allowed = useCan(action, subject)
  return allowed ? <>{children}</> : <>{fallback}</>
}
