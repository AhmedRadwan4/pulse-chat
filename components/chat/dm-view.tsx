'use client'

import { DmHeader } from '@/components/chat/dm-header'
import { MessageInput } from '@/components/chat/message-input'
import { MessageList } from '@/components/chat/message-list'
import { MonitoringBadge } from '@/components/shared/MonitoringBadge'
import { ThreadPanel } from '@/components/threads/thread-panel'
import { useChatStore } from '@/store/chat'

interface DmViewProps {
  channelId: string
}

export function DmView({ channelId }: DmViewProps) {
  const openThreadId = useChatStore(s => s.openThreadId)

  return (
    <div className='flex h-full overflow-hidden'>
      <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
        <DmHeader channelId={channelId} />
        <div className='flex justify-end border-border border-b bg-background px-4 py-1.5'>
          <MonitoringBadge mode='E2E_ENCRYPTED' />
        </div>
        <MessageList channelId={channelId} />
        <MessageInput channelId={channelId} />
      </div>

      {openThreadId && <ThreadPanel threadId={openThreadId} />}
    </div>
  )
}
