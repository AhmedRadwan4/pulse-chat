'use client'

import { createContext, useContext } from 'react'
import type { Action, PermissionMap } from '@/lib/permissions'

const PermissionsContext = createContext<PermissionMap>({})

export function PermissionsProvider({
  permissions,
  children
}: {
  permissions: PermissionMap
  children: React.ReactNode
}) {
  return <PermissionsContext.Provider value={permissions}>{children}</PermissionsContext.Provider>
}

export function usePermissions(): PermissionMap {
  return useContext(PermissionsContext)
}

export function useCan(action: Action, subject: string): boolean {
  const permissions = usePermissions()
  return permissions[subject]?.[action] ?? false
}
