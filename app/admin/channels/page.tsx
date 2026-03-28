import { ChannelsTable } from '@/components/admin/channels-table'

export default function AdminChannelsPage() {
  return (
    <div className='space-y-6 p-6'>
      <div>
        <h1 className='font-semibold text-2xl'>Channels</h1>
        <p className='mt-1 text-muted-foreground text-sm'>View and manage all channels</p>
      </div>
      <ChannelsTable />
    </div>
  )
}
