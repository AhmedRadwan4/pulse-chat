import { StatsCards } from '@/components/admin/stats-cards'

export default function AdminDashboardPage() {
  return (
    <div className='space-y-6 p-6'>
      <div>
        <h1 className='font-semibold text-2xl'>Dashboard</h1>
        <p className='mt-1 text-muted-foreground text-sm'>Overview of your PulseChat instance</p>
      </div>
      <StatsCards />
    </div>
  )
}
