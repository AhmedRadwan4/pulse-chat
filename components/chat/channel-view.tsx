'use client'

import { useQuery } from '@tanstack/react-query'
import { ChannelHeader } from '@/components/channels/channel-header'
import { MessageInput } from '@/components/chat/message-input'
import { MessageList } from '@/components/chat/message-list'
import { MonitoringBadge } from '@/components/shared/MonitoringBadge'
import { ThreadPanel } from '@/components/threads/thread-panel'
import { api } from '@/lib/axios'
import { useChatStore } from '@/store/chat'
import type { Channel } from '@/types/db'

interface ChannelViewProps {
  channelId: string
}

export function ChannelView({ channelId }: ChannelViewProps) {
  const openThreadId = useChatStore(s => s.openThreadId)

  const { data: channel } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const res = await api.get<Channel>(`/api/channels/${channelId}`)
      return res.data
    },
    enabled: !!channelId
  })

  return (
    <div className='flex h-full overflow-hidden'>
      <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
        <ChannelHeader channelId={channelId} />
        {channel && (
          <div className='flex justify-end border-border border-b bg-background px-4 py-1.5'>
            <MonitoringBadge mode={channel.mode} />
          </div>
        )}
        <MessageList channelId={channelId} />
        <MessageInput channelId={channelId} channelName={channel?.name ?? undefined} />
      </div>

      {openThreadId && <ThreadPanel threadId={openThreadId} />}
    </div>
  )
}
