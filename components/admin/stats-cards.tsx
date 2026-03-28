'use client'

import { IconBan, IconHash, IconMessage, IconUsers } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'

interface Stats {
  userCount: number
  channelCount: number
  messageCount: number
  bannedCount: number
}

const CARDS = [
  { key: 'userCount' as const, label: 'Total Users', icon: IconUsers, color: 'text-blue-500' },
  { key: 'channelCount' as const, label: 'Channels', icon: IconHash, color: 'text-violet-500' },
  { key: 'messageCount' as const, label: 'Messages', icon: IconMessage, color: 'text-emerald-500' },
  { key: 'bannedCount' as const, label: 'Banned Users', icon: IconBan, color: 'text-destructive' }
]

export function StatsCards() {
  const { data, isPending } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await api.get<Stats>('/api/admin/stats')
      return res.data
    }
  })

  return (
    <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
      {CARDS.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className='space-y-2 rounded-xl border border-border bg-card p-4'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-sm'>{label}</span>
            <Icon className={`size-4 ${color}`} />
          </div>
          <p className='font-semibold text-2xl'>
            {isPending ? (
              <span className='inline-block h-6 w-12 animate-pulse rounded bg-muted' />
            ) : (
              (data?.[key] ?? 0).toLocaleString()
            )}
          </p>
        </div>
      ))}
    </div>
  )
}
