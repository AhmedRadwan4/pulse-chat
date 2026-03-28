'use client'

import { IconHash, IconMenu2, IconSearch, IconSettings, IconUsers } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { SearchPanel } from '@/components/chat/search-panel'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/axios'
import { useChatStore } from '@/store/chat'
import type { Channel } from '@/types/db'

interface ChannelHeaderProps {
  channelId: string
}

export function ChannelHeader({ channelId }: ChannelHeaderProps) {
  const toggleSidebar = useChatStore(s => s.toggleSidebar)
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user?.id
  const [searchOpen, setSearchOpen] = useState(false)

  const { data: channel } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const res = await api.get<Channel>(`/api/channels/${channelId}`)
      return res.data
    },
    enabled: !!channelId
  })

  const isOwner = channel?.createdById === currentUserId

  return (
    <>
      <TooltipProvider>
        <header className='flex h-12 shrink-0 items-center gap-2 border-border border-b bg-background px-4'>
          <Button
            variant='ghost'
            size='icon-sm'
            className='md:hidden'
            onClick={toggleSidebar}
            aria-label='Toggle sidebar'
          >
            <IconMenu2 className='size-4' />
          </Button>

          <div className='flex min-w-0 flex-1 items-center gap-2'>
            <IconHash className='size-4 shrink-0 text-muted-foreground' />
            <h1 className='truncate font-semibold text-sm'>{channel?.name ?? 'Loading...'}</h1>
            {channel?.description && (
              <>
                <Separator orientation='vertical' className='h-4' />
                <p className='truncate text-muted-foreground text-xs'>{channel.description}</p>
              </>
            )}
          </div>

          <div className='flex items-center gap-1'>
            {channel?._count?.members != null && (
              <Tooltip>
                <TooltipTrigger>
                  <div className='flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-xs'>
                    <IconUsers className='size-3.5' />
                    <span>{channel._count.members}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{channel._count.members} members</TooltipContent>
              </Tooltip>
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

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant='ghost' size='icon-sm' aria-label='Channel settings' />}>
                  <IconSettings className='size-4' />
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem>Edit Channel</DropdownMenuItem>
                  <DropdownMenuItem>Manage Members</DropdownMenuItem>
                  <DropdownMenuItem variant='destructive'>Delete Channel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
      </TooltipProvider>

      <SearchPanel open={searchOpen} onOpenChange={setSearchOpen} channelId={channelId} />
    </>
  )
}
