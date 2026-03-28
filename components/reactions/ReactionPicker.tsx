'use client'

import { IconMoodSmile } from '@tabler/icons-react'
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getSocket } from '@/lib/socket'

interface ReactionPickerProps {
  messageId: string
  onOpenChange?: (open: boolean) => void
}

export function ReactionPicker({ messageId, onOpenChange }: ReactionPickerProps) {
  const [open, setOpen] = useState(false)

  function handleOpenChange(v: boolean) {
    setOpen(v)
    onOpenChange?.(v)
  }

  function handleEmojiClick(data: EmojiClickData) {
    const socket = getSocket()
    if (!socket) return
    socket.emit('reaction:add', { messageId, emoji: data.emoji })
    handleOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button variant='ghost' size='icon-sm' aria-label='Add reaction'>
                  <IconMoodSmile className='size-4' />
                </Button>
              }
            />
          }
        />
        <TooltipContent>Add Reaction</TooltipContent>
      </Tooltip>

      <PopoverContent className='w-auto p-0' side='top' align='start'>
        <EmojiPicker onEmojiClick={handleEmojiClick} lazyLoadEmojis />
      </PopoverContent>
    </Popover>
  )
}
