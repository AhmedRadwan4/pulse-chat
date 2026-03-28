'use client'

import { IconDownload, IconFileText } from '@tabler/icons-react'
import { format, isToday, isYesterday } from 'date-fns'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { MessageActions } from '@/components/messages/message-actions'
import { UserAvatar } from '@/components/presence/user-avatar'
import { ReactionBar } from '@/components/reactions/ReactionBar'
import { getSocket } from '@/lib/socket'
import type { Message, ReadReceiptUser } from '@/types/db'

interface MessageBubbleProps {
  message: Message
  isCurrentUser: boolean
  currentUserId: string
  showAvatar: boolean
  readBy?: ReadReceiptUser[]
}

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr)
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`
  return format(date, 'MMM d, HH:mm')
}

function renderContent(text: string, isCurrentUser: boolean) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|https?:\/\/[^\s]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={i}
          className={`rounded px-1 py-0.5 font-mono text-xs ${isCurrentUser ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted'}`}
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target='_blank'
          rel='noopener noreferrer'
          className={`underline underline-offset-2 ${isCurrentUser ? 'text-primary-foreground/90 hover:text-primary-foreground' : 'text-primary hover:text-primary/80'}`}
        >
          {part}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function MessageBubble({ message, isCurrentUser, currentUserId, showAvatar, readBy = [] }: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content ?? '')
  const [isHovered, setIsHovered] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)

  const isDeleted = !!message.deletedAt

  function handleEditSave() {
    const socket = getSocket()
    if (!socket || !editContent.trim()) return
    socket.emit('message:edit', { messageId: message.id, content: editContent.trim() })
    setIsEditing(false)
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEditSave()
    }
    if (e.key === 'Escape') {
      setEditContent(message.content ?? '')
      setIsEditing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className='group relative flex gap-3 px-4 py-1 hover:bg-muted/20'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar column — always 32px wide to keep alignment */}
      <div className='w-8 shrink-0 pt-0.5'>
        {showAvatar ? (
          <UserAvatar userId={message.sender.id} name={message.sender.name} image={message.sender.image} />
        ) : null}
      </div>

      {/* Content */}
      <div className='min-w-0 flex-1'>
        {showAvatar && (
          <div className='mb-1 flex items-baseline gap-2'>
            <span className='font-semibold text-sm'>{message.sender.name}</span>
            <span className='text-muted-foreground text-xs'>{formatMessageTime(message.createdAt)}</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 ${
            isCurrentUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/60 border border-border text-foreground'
          } ${isDeleted ? 'opacity-60' : ''}`}
        >
          {isDeleted ? (
            <p className='text-sm italic opacity-70'>[Message deleted]</p>
          ) : isEditing ? (
            <div className='space-y-1'>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className='w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/50'
                rows={2}
                autoFocus
              />
              <p className={`text-xs ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                Enter to save · Esc to cancel
              </p>
            </div>
          ) : (
            <p className='break-words text-sm leading-relaxed'>
              {message.content ? renderContent(message.content, isCurrentUser) : null}
              {message.editedAt && (
                <span className={`ml-1 text-xs ${isCurrentUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  (edited)
                </span>
              )}
            </p>
          )}

          {/* Attachments */}
          {!isDeleted && message.attachments.length > 0 && (
            <div className='mt-1.5 flex flex-wrap gap-2'>
              {message.attachments.map(attachment => {
                if (attachment.type === 'IMAGE') {
                  return (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='block overflow-hidden rounded-lg'
                    >
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className='max-h-48 max-w-xs rounded-lg object-cover'
                        loading='lazy'
                      />
                    </a>
                  )
                }
                return (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    download={attachment.name}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      isCurrentUser
                        ? 'border-primary-foreground/30 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground'
                        : 'border-border bg-background/50 hover:bg-muted text-foreground'
                    }`}
                  >
                    <IconFileText className='size-4 shrink-0 opacity-70' />
                    <span className='max-w-48 truncate'>{attachment.name}</span>
                    <IconDownload className='size-3.5 shrink-0 opacity-70' />
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* Reactions — outside bubble */}
        {!isDeleted && (
          <ReactionBar messageId={message.id} reactions={message.reactions} currentUserId={currentUserId} />
        )}

        {/* Read receipts — shown only on current user's messages */}
        {isCurrentUser && readBy.length > 0 && (
          <div className='mt-1 flex items-center gap-1'>
            <span className='text-muted-foreground text-xs'>Seen</span>
            <div className='flex -space-x-1'>
              {readBy.slice(0, 5).map(r => (
                <UserAvatar
                  key={r.userId}
                  userId={r.userId}
                  name={r.userName}
                  image={r.userImage}
                  showPresence={false}
                  className='h-4 w-4'
                />
              ))}
            </div>
            {readBy.length > 5 && <span className='text-muted-foreground text-xs'>+{readBy.length - 5}</span>}
          </div>
        )}
      </div>

      {/* Hover actions — also stay mounted while any popup inside is open */}
      {!isDeleted && !isEditing && (isHovered || isActionsOpen) && (
        <div className='absolute top-0 right-4 -translate-y-1/2'>
          <MessageActions
            message={message}
            isCurrentUser={isCurrentUser}
            onEditStart={() => setIsEditing(true)}
            onPopupChange={setIsActionsOpen}
          />
        </div>
      )}
    </motion.div>
  )
}
