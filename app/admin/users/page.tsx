import { UsersTable } from '@/components/admin/users-table'

export default function AdminUsersPage() {
  return (
    <div className='space-y-6 p-6'>
      <div>
        <h1 className='font-semibold text-2xl'>Users</h1>
        <p className='mt-1 text-muted-foreground text-sm'>Manage user accounts, roles, and bans</p>
      </div>
      <UsersTable />
    </div>
  )
}
