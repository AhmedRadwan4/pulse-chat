'use client'

import { format, isToday, isYesterday } from 'date-fns'
import { useState } from 'react'
import { UserAvatar } from '@/components/presence/user-avatar'
import { ReactionBar } from '@/components/reactions/ReactionBar'
import { ReactionPicker } from '@/components/reactions/ReactionPicker'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Message } from '@/types/db'

interface ThreadMessageProps {
  message: Message
  showAvatar: boolean
  currentUserId: string
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`
  return format(date, 'MMM d, HH:mm')
}

export function ThreadMessage({ message, showAvatar, currentUserId }: ThreadMessageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isDeleted = !!message.deletedAt

  return (
    <div
      className='group relative flex gap-2.5 px-3 py-0.5 hover:bg-muted/30'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className='w-7 shrink-0'>
        {showAvatar ? (
          <UserAvatar
            userId={message.sender.id}
            name={message.sender.name}
            image={message.sender.image}
            className='h-7 w-7'
          />
        ) : null}
      </div>

      <div className='min-w-0 flex-1'>
        {showAvatar && (
          <div className='mb-0.5 flex items-baseline gap-2'>
            <span className='font-semibold text-sm'>{message.sender.name}</span>
            <span className='text-muted-foreground text-xs'>{formatTime(message.createdAt)}</span>
            {message.editedAt && <span className='text-muted-foreground text-xs'>(edited)</span>}
          </div>
        )}

        {isDeleted ? (
          <p className='text-muted-foreground text-sm italic'>[Message deleted]</p>
        ) : (
          <p className='break-words text-sm leading-relaxed'>{message.content}</p>
        )}

        {!isDeleted && (
          <ReactionBar messageId={message.id} reactions={message.reactions} currentUserId={currentUserId} />
        )}
      </div>

      {/* Hover reaction picker */}
      {!isDeleted && isHovered && (
        <div className='absolute top-0 right-3 -translate-y-1/2'>
          <TooltipProvider>
            <div className='flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5 shadow-sm'>
              <ReactionPicker messageId={message.id} />
            </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
