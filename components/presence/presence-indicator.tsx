'use client'

import { usePresenceStore } from '@/store/presence'

interface PresenceIndicatorProps {
  userId: string
  className?: string
}

const STATUS_COLOR: Record<string, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-400',
  offline: 'bg-gray-400'
}

export function PresenceIndicator({ userId, className }: PresenceIndicatorProps) {
  const presence = usePresenceStore(s => s.onlineUsers.get(userId))
  const status = presence?.status ?? 'offline'
  const color = STATUS_COLOR[status] ?? STATUS_COLOR.offline
  return (
    <span
      className={['inline-block h-2 w-2 rounded-full', color, className ?? ''].join(' ')}
      aria-label={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  )
}
