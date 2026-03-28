'use client'

import { useTypingContext } from '@/contexts/typing-context'

interface TypingIndicatorProps {
  channelId: string
  currentUserId: string
}

export function TypingIndicator({ channelId, currentUserId }: TypingIndicatorProps) {
  const { typingUsers } = useTypingContext()
  const rawTypers = typingUsers.get(channelId) ?? []
  const typers = rawTypers.filter(u => u.id !== currentUserId)

  if (typers.length === 0) return null

  let text: string
  if (typers.length === 1) {
    text = `${typers[0].name} is typing...`
  } else if (typers.length === 2) {
    text = `${typers[0].name} and ${typers[1].name} are typing...`
  } else {
    text = 'Several people are typing...'
  }

  return (
    <div className='flex items-center gap-1.5 px-4 py-1 text-muted-foreground text-xs'>
      <span className='flex gap-0.5'>
        <span className='h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]' />
        <span className='h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]' />
        <span className='h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]' />
      </span>
      <span>{text}</span>
    </div>
  )
}
