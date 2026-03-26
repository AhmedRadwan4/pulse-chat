'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type UserLike = {
  name?: string | null
  image?: string | null
}

const MAX_VISIBLE = 4

export function AvatarGroup({ users }: { users: UserLike[] }) {
  const visible = users.slice(0, MAX_VISIBLE)
  const overflow = users.length - MAX_VISIBLE

  return (
    <div className='flex -space-x-2'>
      {visible.map((user, i) => (
        <Avatar key={i} size='sm' className='ring-2 ring-background'>
          {user.image && <AvatarImage src={user.image} alt={user.name ?? ''} />}
          <AvatarFallback>
            {user.name
              ? user.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : '?'}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div className='relative flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs ring-2 ring-background'>
          +{overflow}
        </div>
      )}
    </div>
  )
}
