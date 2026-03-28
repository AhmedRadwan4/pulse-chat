'use client'

import { PresenceIndicator } from '@/components/presence/presence-indicator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface UserAvatarProps {
  userId: string
  name: string
  image?: string | null
  showPresence?: boolean
  size?: 'sm' | 'md'
  className?: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function UserAvatar({ userId, name, image, showPresence = true, size = 'sm', className }: UserAvatarProps) {
  return (
    <div className={['relative inline-flex shrink-0', className ?? ''].join(' ')}>
      <Avatar size={size} className='mt-0.5'>
        <AvatarImage src={image ?? undefined} alt={name} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      {showPresence && (
        <PresenceIndicator userId={userId} className='absolute right-0 bottom-0 border border-background' />
      )}
    </div>
  )
}
