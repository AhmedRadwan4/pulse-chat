'use client'

import { EmojiButton } from '@/components/reactions/EmojiButton'
import { getSocket } from '@/lib/socket'

interface ReactionBarProps {
  messageId: string
  reactions: { emoji: string; count: number; userIds: string[] }[]
  currentUserId: string
}

export function ReactionBar({ messageId, reactions, currentUserId }: ReactionBarProps) {
  if (reactions.length === 0) return null

  function handleToggle(emoji: string, userIds: string[]) {
    const socket = getSocket()
    if (!socket) return
    if (userIds.includes(currentUserId)) {
      socket.emit('reaction:remove', { messageId, emoji })
    } else {
      socket.emit('reaction:add', { messageId, emoji })
    }
  }

  return (
    <div className='mt-1 flex flex-wrap gap-1'>
      {reactions.map(r => (
        <EmojiButton
          key={r.emoji}
          emoji={r.emoji}
          count={r.count}
          isActive={r.userIds.includes(currentUserId)}
          onClick={() => handleToggle(r.emoji, r.userIds)}
        />
      ))}
    </div>
  )
}
