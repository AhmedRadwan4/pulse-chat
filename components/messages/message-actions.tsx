'use client'

import { IconEdit, IconMessageCircle, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { ReactionPicker } from '@/components/reactions/ReactionPicker'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getSocket } from '@/lib/socket'
import { useChatStore } from '@/store/chat'
import type { Message } from '@/types/db'

interface MessageActionsProps {
  message: Message
  isCurrentUser: boolean
  onEditStart: () => void
  onPopupChange?: (open: boolean) => void
}

export function MessageActions({ message, isCurrentUser, onEditStart, onPopupChange }: MessageActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false)

  function handleDeleteOpen(v: boolean) {
    setDeleteOpen(v)
    onPopupChange?.(v || reactionPickerOpen)
  }

  function handleReactionPickerOpen(v: boolean) {
    setReactionPickerOpen(v)
    onPopupChange?.(v || deleteOpen)
  }
  const setOpenThread = useChatStore(s => s.setOpenThread)

  function handleDelete() {
    const socket = getSocket()
    if (!socket) return
    socket.emit('message:delete', { messageId: message.id })
    setDeleteOpen(false)
  }

  function handleThreadOpen() {
    setOpenThread(message.threadId ?? message.id)
  }

  return (
    <TooltipProvider>
      <div className='flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5 shadow-sm'>
        <ReactionPicker messageId={message.id} onOpenChange={handleReactionPickerOpen} />

        <Tooltip>
          <TooltipTrigger
            render={<Button variant='ghost' size='icon-sm' aria-label='Reply in thread' onClick={handleThreadOpen} />}
          >
            <IconMessageCircle className='size-4' />
          </TooltipTrigger>
          <TooltipContent>Reply in Thread</TooltipContent>
        </Tooltip>

        {isCurrentUser && (
          <>
            <Tooltip>
              <TooltipTrigger
                render={<Button variant='ghost' size='icon-sm' aria-label='Edit message' onClick={onEditStart} />}
              >
                <IconEdit className='size-4' />
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    aria-label='Delete message'
                    onClick={() => setDeleteOpen(true)}
                    className='text-destructive hover:text-destructive'
                  />
                }
              >
                <IconTrash className='size-4' />
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      <Dialog open={deleteOpen} onOpenChange={handleDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
          </DialogHeader>
          <p className='text-muted-foreground text-sm'>
            Are you sure you want to delete this message? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
