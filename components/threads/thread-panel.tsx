'use client'

import { IconX } from '@tabler/icons-react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { MessageBubble } from '@/components/messages/message-bubble'
import { ThreadInput } from '@/components/threads/thread-input'
import { ThreadMessage } from '@/components/threads/thread-message'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/axios'
import { getSocket } from '@/lib/socket'
import { useChatStore } from '@/store/chat'
import type { Message } from '@/types/db'

interface ThreadData {
  thread: { id: string; parentMessageId: string; channelId: string }
  parentMessage: Message | null
  messages: Message[]
  nextCursor: string | null
}

interface ThreadPanelProps {
  // Can be a Thread.id or parent Message.id — API resolves either
  threadId: string
}

export function ThreadPanel({ threadId }: ThreadPanelProps) {
  const setOpenThread = useChatStore(s => s.setOpenThread)
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user?.id ?? ''
  const bottomRef = useRef<HTMLDivElement>(null)
  const resolvedThreadIdRef = useRef<string | null>(null)

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['thread', threadId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const url = pageParam ? `/api/threads/${threadId}?cursor=${pageParam}` : `/api/threads/${threadId}`
      const res = await api.get<ThreadData>(url)
      return res.data
    },
    getNextPageParam: (lastPage: ThreadData) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined
  })

  const thread = data?.pages[0]?.thread ?? null
  const parentMessage = data?.pages[0]?.parentMessage ?? null
  const allMessages = data?.pages.flatMap(p => p.messages) ?? []

  // Subscribe to socket thread room once thread ID is resolved
  useEffect(() => {
    if (!thread) return
    if (resolvedThreadIdRef.current === thread.id) return
    resolvedThreadIdRef.current = thread.id

    const socket = getSocket()
    if (!socket) return
    socket.emit('thread:subscribe', { threadId: thread.id })
  }, [thread])

  // Handle incoming thread replies
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    function onThreadReceive(message: Message) {
      if (!resolvedThreadIdRef.current) return
      if (message.threadId !== resolvedThreadIdRef.current) return
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] })
    }

    type ReactionUpdate = {
      emoji: string
      count: number
      users: { id: string; name: string; username: string | null }[]
    }
    function onReactionUpdate({ messageId, reactions }: { messageId: string; reactions: ReactionUpdate[] }) {
      const mapped = reactions.map(r => ({ emoji: r.emoji, count: r.count, userIds: r.users.map(u => u.id) }))
      queryClient.setQueryData(
        ['thread', threadId],
        (
          old:
            | {
                pages: {
                  thread: unknown
                  parentMessage: Message | null
                  messages: Message[]
                  nextCursor: string | null
                }[]
                pageParams: unknown[]
              }
            | undefined
        ) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              parentMessage:
                page.parentMessage?.id === messageId
                  ? { ...page.parentMessage, reactions: mapped }
                  : page.parentMessage,
              messages: page.messages.map(m => (m.id === messageId ? { ...m, reactions: mapped } : m))
            }))
          }
        }
      )
    }

    socket.on('thread:receive', onThreadReceive)
    socket.on('reaction:update', onReactionUpdate)
    return () => {
      socket.off('thread:receive', onThreadReceive)
      socket.off('reaction:update', onReactionUpdate)
    }
  }, [threadId, queryClient])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages.length])

  return (
    <div className='flex h-full w-80 shrink-0 flex-col border-border border-l bg-background'>
      {/* Header */}
      <div className='flex items-center justify-between border-border border-b px-4 py-3'>
        <h2 className='font-semibold text-sm'>Thread</h2>
        <Button variant='ghost' size='icon-sm' onClick={() => setOpenThread(null)} aria-label='Close thread'>
          <IconX className='size-4' />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
        {/* Parent message */}
        {parentMessage && (
          <div className='border-border/50 border-b'>
            <MessageBubble
              message={parentMessage}
              isCurrentUser={parentMessage.senderId === currentUserId}
              currentUserId={currentUserId}
              showAvatar
            />
          </div>
        )}

        {/* Reply count */}
        {!isLoading && (
          <div className='flex items-center gap-3 px-4 py-2'>
            <span className='text-muted-foreground text-xs'>
              {allMessages.length === 0
                ? 'No replies yet'
                : `${allMessages.length} ${allMessages.length === 1 ? 'reply' : 'replies'}`}
            </span>
            {allMessages.length > 0 && <div className='h-px flex-1 bg-border' />}
          </div>
        )}

        {/* Load earlier replies */}
        {hasNextPage && (
          <div className='flex justify-center py-2'>
            <Button variant='ghost' size='sm' onClick={() => fetchNextPage()}>
              Load earlier replies
            </Button>
          </div>
        )}

        {/* Thread replies */}
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center py-8'>
            <div className='h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent' />
          </div>
        ) : (
          <div className='py-2'>
            {allMessages.map((msg, i) => {
              const prev = allMessages[i - 1]
              const showAvatar =
                !prev ||
                prev.senderId !== msg.senderId ||
                new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000
              return <ThreadMessage key={msg.id} message={msg} showAvatar={showAvatar} currentUserId={currentUserId} />
            })}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply input — only available once thread is resolved */}
      {thread && <ThreadInput threadId={thread.id} />}
    </div>
  )
}
