'use client'

import { IconMenu2, IconSearch } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { SearchPanel } from '@/components/chat/search-panel'
import { PresenceIndicator } from '@/components/presence/presence-indicator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/axios'
import { useChatStore } from '@/store/chat'
import type { Channel, Member } from '@/types/db'

interface DmHeaderProps {
  channelId: string
}

type ChannelWithMembers = Channel & { members: Member[] }

export function DmHeader({ channelId }: DmHeaderProps) {
  const toggleSidebar = useChatStore(s => s.toggleSidebar)
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user?.id
  const [searchOpen, setSearchOpen] = useState(false)

  const { data: channel } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const res = await api.get<ChannelWithMembers>(`/api/channels/${channelId}`)
      return res.data
    },
    enabled: !!channelId
  })

  const otherMember = channel?.members?.find(m => m.userId !== currentUserId)
  const otherUser = otherMember?.user

  function getInitials(name: string) {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      <TooltipProvider>
        <header className='flex h-12 shrink-0 items-center gap-3 border-border border-b bg-background px-4'>
          <Button
            variant='ghost'
            size='icon-sm'
            className='md:hidden'
            onClick={toggleSidebar}
            aria-label='Toggle sidebar'
          >
            <IconMenu2 className='size-4' />
          </Button>

          {otherUser ? (
            <div className='flex min-w-0 flex-1 items-center gap-2'>
              <div className='relative shrink-0'>
                <Avatar size='sm'>
                  <AvatarImage src={otherUser.image ?? undefined} alt={otherUser.name} />
                  <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
                </Avatar>
                <PresenceIndicator
                  userId={otherUser.id}
                  className='absolute right-0 bottom-0 border border-background'
                />
              </div>
              <div className='min-w-0'>
                <h1 className='truncate font-semibold text-sm'>{otherUser.name}</h1>
                {otherUser.username && <p className='truncate text-muted-foreground text-xs'>@{otherUser.username}</p>}
              </div>
            </div>
          ) : (
            <div className='flex-1'>
              <h1 className='font-semibold text-muted-foreground text-sm'>Loading...</h1>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon-sm'
                  aria-label='Search messages'
                  onClick={() => setSearchOpen(true)}
                />
              }
            >
              <IconSearch className='size-4' />
            </TooltipTrigger>
            <TooltipContent>Search</TooltipContent>
          </Tooltip>
        </header>
      </TooltipProvider>

      <SearchPanel open={searchOpen} onOpenChange={setSearchOpen} channelId={channelId} />
    </>
  )
}
