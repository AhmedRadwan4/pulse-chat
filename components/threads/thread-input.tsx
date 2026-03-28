'use client'

import { IconSend } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getSocket } from '@/lib/socket'

interface ThreadInputProps {
  threadId: string
}

export function ThreadInput({ threadId }: ThreadInputProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendReply()
    }
  }

  function sendReply() {
    const trimmed = content.trim()
    if (!trimmed) return
    const socket = getSocket()
    if (!socket) return
    socket.emit('thread:reply', { threadId, content: trimmed })
    setContent('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  return (
    <div className='border-border border-t p-3'>
      <div className='flex items-end gap-2 rounded-lg border border-input bg-muted/30 px-3 py-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30'>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder='Reply in thread…'
          rows={1}
          className='max-h-[120px] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground'
        />
        <Button size='icon-sm' variant='ghost' onClick={sendReply} disabled={!content.trim()} className='shrink-0'>
          <IconSend className='size-4' />
        </Button>
      </div>
      <p className='mt-1 text-muted-foreground text-xs'>Enter to send · Shift+Enter for new line</p>
    </div>
  )
}
