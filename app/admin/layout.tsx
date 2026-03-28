import { Suspense } from 'react'
import { AdminShell } from '@/components/admin/admin-shell'
import { requireAdmin } from '@/lib/session'

async function AuthenticatedAdminShell({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()
  return <AdminShell user={user}>{children}</AdminShell>
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AuthenticatedAdminShell>{children}</AuthenticatedAdminShell>
    </Suspense>
  )
}
