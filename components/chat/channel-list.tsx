'use client'

import { IconHash, IconLogout, IconMessage, IconPlus, IconSettings } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CreateChannelModal } from '@/components/channels/create-channel-modal'
import { NewDmModal } from '@/components/chat/new-dm-modal'
import { NotificationPanel } from '@/components/chat/notification-panel'
import { PresenceIndicator } from '@/components/presence/presence-indicator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/axios'
import type { AuthUser } from '@/lib/session'
import { getSocket } from '@/lib/socket'
import { useChatStore } from '@/store/chat'
import type { Channel } from '@/types/db'

interface DmEntry {
  channelId: string
  otherUser: { id: string; name: string; username: string | null; image: string | null } | null
}

interface ChannelListProps {
  user: AuthUser
}

export function ChannelList({ user }: ChannelListProps) {
  const params = useParams()
  const activeChannelId = params?.channelId as string | undefined
  const setActiveChannel = useChatStore(s => s.setActiveChannel)
  const [channelModalOpen, setChannelModalOpen] = useState(false)
  const [dmModalOpen, setDmModalOpen] = useState(false)

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const res = await api.get<{ channels: Channel[] }>('/api/channels')
      return res.data.channels
    }
  })

  const { data: dmsData } = useQuery({
    queryKey: ['dms'],
    queryFn: async () => {
      const res = await api.get<{ dms: DmEntry[] }>('/api/direct-messages')
      return res.data.dms
    }
  })

  const channels = channelsData ?? []
  const dms = dmsData ?? []

  useEffect(() => {
    if (channels.length === 0) return
    const socket = getSocket()
    if (!socket) return
    channels.forEach(c => socket.emit('channel:join', { channelId: c.id }))
  }, [channels])

  useEffect(() => {
    if (dms.length === 0) return
    const socket = getSocket()
    if (!socket) return
    dms.forEach(dm => socket.emit('channel:join', { channelId: dm.channelId }))
  }, [dms])

  useEffect(() => {
    if (activeChannelId) {
      setActiveChannel(activeChannelId)
    }
  }, [activeChannelId, setActiveChannel])

  function getInitials(name: string) {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <TooltipProvider>
      <div className='flex h-full flex-col'>
        {/* App header */}
        <div className='flex h-12 items-center gap-2 px-4'>
          <div className='flex h-6 w-6 items-center justify-center rounded-md bg-primary'>
            <span className='font-bold text-primary-foreground text-xs'>P</span>
          </div>
          <span className='font-semibold text-sm tracking-tight'>PulseChat</span>
          <div className='ml-auto'>
            <NotificationPanel />
          </div>
        </div>

        <Separator />

        <ScrollArea className='flex-1'>
          <div className='px-2 pb-2'>
            {/* Channels section */}
            <div className='flex items-center justify-between px-2 py-2'>
              <span className='font-semibold text-muted-foreground text-xs uppercase tracking-wider'>Channels</span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      aria-label='New channel'
                      onClick={() => setChannelModalOpen(true)}
                    />
                  }
                >
                  <IconPlus className='size-4' />
                </TooltipTrigger>
                <TooltipContent>New Channel</TooltipContent>
              </Tooltip>
            </div>
            <CreateChannelModal open={channelModalOpen} onOpenChange={setChannelModalOpen} />

            <div className='space-y-0.5'>
              {channels.length === 0 && (
                <p className='px-2 py-2 text-center text-muted-foreground text-xs'>No channels yet</p>
              )}
              {channels.map(channel => {
                const isActive = channel.id === activeChannelId
                return (
                  <Link
                    key={channel.id}
                    href={`/chat/${channel.id}`}
                    onClick={() => setActiveChannel(channel.id)}
                    className={[
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-accent font-medium text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    ].join(' ')}
                  >
                    <IconHash className='size-4 shrink-0' />
                    <span className='truncate'>{channel.name ?? 'Unnamed'}</span>
                  </Link>
                )
              })}
            </div>

            {/* Direct Messages section */}
            <div className='flex items-center justify-between px-2 pt-4 pb-2'>
              <span className='font-semibold text-muted-foreground text-xs uppercase tracking-wider'>
                Direct Messages
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      aria-label='New direct message'
                      onClick={() => setDmModalOpen(true)}
                    />
                  }
                >
                  <IconPlus className='size-4' />
                </TooltipTrigger>
                <TooltipContent>New Direct Message</TooltipContent>
              </Tooltip>
            </div>
            <NewDmModal open={dmModalOpen} onOpenChange={setDmModalOpen} />

            <div className='space-y-0.5'>
              {dms.length === 0 && (
                <p className='px-2 py-2 text-center text-muted-foreground text-xs'>No direct messages</p>
              )}
              {dms.map(dm => {
                const isActive = dm.channelId === activeChannelId
                const u = dm.otherUser
                if (!u) return null
                return (
                  <Link
                    key={dm.channelId}
                    href={`/chat/dm/${dm.channelId}`}
                    onClick={() => setActiveChannel(dm.channelId)}
                    className={[
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-accent font-medium text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    ].join(' ')}
                  >
                    <div className='relative shrink-0'>
                      <Avatar size='xs'>
                        <AvatarImage src={u.image ?? undefined} alt={u.name} />
                        <AvatarFallback className='text-[10px]'>{getInitials(u.name)}</AvatarFallback>
                      </Avatar>
                      <PresenceIndicator
                        userId={u.id}
                        className='absolute -right-0.5 -bottom-0.5 border border-background'
                      />
                    </div>
                    <span className='truncate'>{u.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </ScrollArea>

        <Separator />

        {/* User section */}
        <div className='flex items-center gap-2 p-3'>
          <div className='relative'>
            <Avatar size='sm'>
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <span className='absolute right-0 bottom-0 h-2 w-2 rounded-full border border-background bg-green-500' />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='truncate font-medium text-sm'>{user.name}</p>
            <p className='truncate text-muted-foreground text-xs'>Online</p>
          </div>
          <div className='flex gap-1'>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    render={<Link href='/settings' />}
                    nativeButton={false}
                    variant='ghost'
                    size='icon-sm'
                    aria-label='Settings'
                  />
                }
              >
                <IconSettings className='size-4' />
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    aria-label='Sign out'
                    onClick={() =>
                      authClient.signOut({
                        fetchOptions: {
                          onSuccess: () => {
                            window.location.href = '/auth/signin'
                          }
                        }
                      })
                    }
                  />
                }
              >
                <IconLogout className='size-4' />
              </TooltipTrigger>
              <TooltipContent>Sign Out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
