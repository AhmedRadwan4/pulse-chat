'use client'

import { IconBell, IconHash, IconMessage, IconMessageReply } from '@tabler/icons-react'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/axios'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/store/notifications'
import type { AppNotification } from '@/types/db'

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function TypeIcon({ type }: { type: AppNotification['type'] }) {
  if (type === 'MENTION') return <IconHash className='size-3' />
  if (type === 'DIRECT_MESSAGE') return <IconMessage className='size-3' />
  return <IconMessageReply className='size-3' />
}

function typeLabel(type: AppNotification['type']) {
  if (type === 'MENTION') return 'mentioned you'
  if (type === 'DIRECT_MESSAGE') return 'sent you a message'
  return 'replied in a thread'
}

export function NotificationPanel() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore()
  const router = useRouter()

  async function handleMarkAll() {
    await api.post('/api/notifications/read-all')
    markAllRead()
  }

  async function handleItemClick(notif: AppNotification) {
    if (!notif.read) {
      void api.patch(`/api/notifications/${notif.id}/read`)
      markRead(notif.id)
    }
    if (notif.channelId) {
      const path = notif.type === 'DIRECT_MESSAGE' ? `/chat/dm/${notif.channelId}` : `/chat/${notif.channelId}`
      router.push(path)
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant='ghost' size='icon-sm' aria-label='Notifications' className='relative' />}
      >
        <IconBell className='size-4' />
        {unreadCount > 0 && (
          <span className='absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-semibold text-[10px] text-primary-foreground'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent side='bottom' align='end' className='w-80 p-0'>
        {/* Header */}
        <div className='flex items-center justify-between border-b px-3 py-2'>
          <span className='font-semibold text-sm'>Notifications</span>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 text-xs'
            onClick={handleMarkAll}
            disabled={unreadCount === 0}
          >
            Mark all read
          </Button>
        </div>

        <ScrollArea className='max-h-[24rem]'>
          {notifications.length === 0 ? (
            <div className='flex flex-col items-center gap-2 px-4 py-10 text-center'>
              <IconBell className='size-8 text-muted-foreground/40' />
              <p className='text-muted-foreground text-sm'>No notifications yet</p>
            </div>
          ) : (
            <div className='p-1'>
              {notifications.map(notif => (
                <button
                  key={notif.id}
                  type='button'
                  onClick={() => handleItemClick(notif)}
                  className={cn(
                    'flex w-full gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-accent',
                    !notif.read && 'bg-primary/5'
                  )}
                >
                  <Avatar size='sm' className='mt-0.5 shrink-0'>
                    <AvatarImage src={notif.actorImage ?? undefined} alt={notif.actorName} />
                    <AvatarFallback>{getInitials(notif.actorName)}</AvatarFallback>
                  </Avatar>

                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-1'>
                      <TypeIcon type={notif.type} />
                      <p className='truncate text-sm'>
                        <span className='font-medium'>{notif.actorName}</span>{' '}
                        <span className='text-muted-foreground'>{typeLabel(notif.type)}</span>
                      </p>
                    </div>
                    {notif.body && <p className='mt-0.5 line-clamp-2 text-muted-foreground text-xs'>{notif.body}</p>}
                    <p className='mt-0.5 text-muted-foreground text-xs'>
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {!notif.read && <span className='mt-2 h-2 w-2 shrink-0 rounded-full bg-primary' />}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
