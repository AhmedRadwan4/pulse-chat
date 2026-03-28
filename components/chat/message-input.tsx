'use client'

import { IconMoodSmile, IconPaperclip, IconSend } from '@tabler/icons-react'
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AttachmentPreview } from '@/components/upload/AttachmentPreview'
import { FileDropzone } from '@/components/upload/FileDropzone'
import { authClient } from '@/lib/auth-client'
import { getSocket } from '@/lib/socket'
import { type UploadResult, uploadFile } from '@/lib/upload'
import { useChatStore } from '@/store/chat'

interface MessageInputProps {
  channelId: string
  channelName?: string
}

interface UploadingFile {
  id: number
  name: string
}

let uploadIdCounter = 0

export function MessageInput({ channelId, channelName }: MessageInputProps) {
  const { data: session } = authClient.useSession()
  const drafts = useChatStore(s => s.drafts)
  const setDraft = useChatStore(s => s.setDraft)
  const [content, setContent] = useState(drafts[channelId] ?? '')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<UploadResult[]>([])
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  // Restore draft when channel changes
  useEffect(() => {
    setContent(drafts[channelId] ?? '')
  }, [channelId])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [content])

  function emitTypingStart() {
    if (isTypingRef.current) return
    const socket = getSocket()
    if (!socket) return
    isTypingRef.current = true
    socket.emit('typing:start', { channelId })
  }

  function emitTypingStop() {
    if (!isTypingRef.current) return
    const socket = getSocket()
    if (!socket) return
    isTypingRef.current = false
    socket.emit('typing:stop', { channelId })
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setContent(val)
    setDraft(channelId, val)

    emitTypingStart()

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      emitTypingStop()
    }, 3000)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function sendMessage() {
    const trimmed = content.trim()
    if (!trimmed && pendingAttachments.length === 0) return

    const socket = getSocket()
    if (!socket) return

    socket.emit('message:new', {
      channelId,
      content: trimmed || undefined,
      attachments:
        pendingAttachments.length > 0
          ? pendingAttachments.map(a => ({ url: a.url, type: a.type, name: a.name, size: a.size }))
          : undefined
    })

    setContent('')
    setDraft(channelId, '')
    setPendingAttachments([])
    emitTypingStop()
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)

    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  function handleEmojiClick(emojiData: EmojiClickData) {
    setContent(prev => prev + emojiData.emoji)
    setEmojiOpen(false)
    // Defer focus: Radix restores focus to the trigger button after its cleanup runs,
    // which overwrites a synchronous focus() call. setTimeout lets that happen first.
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    const batch = files.map(f => ({ id: uploadIdCounter++, name: f.name }))
    setUploading(prev => [...prev, ...batch])

    const results = await Promise.allSettled(files.map(f => uploadFile(f)))

    const batchIds = new Set(batch.map(b => b.id))
    setUploading(prev => prev.filter(u => !batchIds.has(u.id)))

    const succeeded: UploadResult[] = []
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        succeeded.push(result.value)
      } else {
        toast.error(`Failed to upload ${files[i]?.name ?? 'file'}`)
      }
    })

    if (succeeded.length > 0) {
      setPendingAttachments(prev => [...prev, ...succeeded])
    }
  }, [])

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) handleFiles(files)
    e.target.value = ''
  }

  const placeholder = channelName ? `Message #${channelName}` : 'Send a message...'
  const canSend = !!(content.trim() || pendingAttachments.length > 0)
  const isUploading = uploading.length > 0

  return (
    <TooltipProvider>
      <div className='border-border border-t bg-background px-4 py-3'>
        <FileDropzone onFiles={handleFiles}>
          <div className='rounded-xl border border-input bg-muted/30 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20'>
            <AttachmentPreview
              uploading={uploading}
              attachments={pendingAttachments}
              onRemove={i => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}
            />

            <div className='flex items-end gap-2 px-3 py-2'>
              <input
                ref={fileInputRef}
                type='file'
                multiple
                accept='image/*,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg,application/pdf,application/msword,.docx,text/plain'
                className='hidden'
                onChange={handleFileInputChange}
              />

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      type='button'
                      className='mb-0.5 shrink-0'
                      aria-label='Attach file'
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    />
                  }
                >
                  <IconPaperclip className='size-4' />
                </TooltipTrigger>
                <TooltipContent>Attach File</TooltipContent>
              </Tooltip>

              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                className='max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground'
                aria-label={placeholder}
              />

              <div className='mb-0.5 flex shrink-0 items-center gap-1'>
                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <PopoverTrigger
                          render={
                            <Button variant='ghost' size='icon-sm' type='button' aria-label='Emoji picker'>
                              <IconMoodSmile className='size-4' />
                            </Button>
                          }
                        />
                      }
                    />
                    <TooltipContent>Emoji</TooltipContent>
                  </Tooltip>
                  <PopoverContent className='w-auto p-0' side='top' align='end'>
                    <EmojiPicker onEmojiClick={handleEmojiClick} lazyLoadEmojis />
                  </PopoverContent>
                </Popover>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size='icon-sm'
                        type='button'
                        disabled={!canSend || isUploading}
                        onClick={sendMessage}
                        aria-label='Send message'
                      />
                    }
                  >
                    <IconSend className='size-4' />
                  </TooltipTrigger>
                  <TooltipContent>Send</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </FileDropzone>
        <p className='mt-1.5 text-muted-foreground text-xs'>Enter to send · Shift+Enter for new line</p>
      </div>
    </TooltipProvider>
  )
}
