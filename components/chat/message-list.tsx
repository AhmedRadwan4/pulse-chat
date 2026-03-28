'use client'

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { format, isSameDay, isToday, isYesterday } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { MessageBubble } from '@/components/messages/message-bubble'
import { TypingIndicator } from '@/components/presence/typing-indicator'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/axios'
import { getSocket } from '@/lib/socket'
import type { Message, ReadReceiptUser } from '@/types/db'

interface MessageListProps {
  channelId: string
}

interface MessagesPage {
  messages: Message[]
  nextCursor: string | null
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMMM d')
}

type ListItem =
  | { kind: 'date-separator'; key: string; label: string }
  | { kind: 'message'; key: string; message: Message; showAvatar: boolean }

export function MessageList({ channelId }: MessageListProps) {
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user?.id ?? ''
  const queryClient = useQueryClient()
  const parentRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  // messageId → readers (excludes current user's own read)
  const [readReceipts, setReadReceipts] = useState<Map<string, ReadReceiptUser[]>>(new Map())
  const lastEmittedReadRef = useRef<string | null>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['messages', channelId],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { channelId, limit: '50' }
      if (pageParam) params.cursor = pageParam as string
      const res = await api.get<MessagesPage>('/api/messages', { params })
      return res.data
    },
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: !!channelId
  })

  // Flatten pages into chronological order (oldest → newest)
  // API returns each page already in ASC order; data.pages[0] is the most recent batch.
  // Reverse the pages array so oldest batch comes first, then append each page as-is.
  const allMessages: Message[] = []
  if (data) {
    const pages = [...data.pages].reverse()
    for (const page of pages) {
      allMessages.push(...page.messages)
    }
  }

  // Build list items with date separators
  const listItems: ListItem[] = []
  let lastDate: Date | null = null

  for (let i = 0; i < allMessages.length; i++) {
    const msg = allMessages[i]
    const msgDate = new Date(msg.createdAt)

    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      listItems.push({
        kind: 'date-separator',
        key: `sep-${msg.createdAt}`,
        label: formatDateSeparator(msg.createdAt)
      })
      lastDate = msgDate
    }

    const prevMsg = allMessages[i - 1]
    const showAvatar =
      !prevMsg ||
      prevMsg.senderId !== msg.senderId ||
      !isSameDay(new Date(prevMsg.createdAt), msgDate) ||
      new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000

    listItems.push({
      kind: 'message',
      key: msg.id,
      message: msg,
      showAvatar
    })
  }

  const rowVirtualizer = useVirtualizer({
    count: listItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: i => {
      const item = listItems[i]
      if (!item) return 40
      if (item.kind === 'date-separator') return 32
      return item.showAvatar ? 60 : 28
    },
    overscan: 10
  })

  // Track if user is scrolled near bottom
  function handleScroll() {
    const el = parentRef.current
    if (!el) return
    const threshold = 100
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold

    // Load more when scrolled to top
    if (el.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  // Initial scroll to bottom once messages first load
  useEffect(() => {
    if (isLoading || listItems.length === 0) return
    rowVirtualizer.scrollToIndex(listItems.length - 1, { align: 'end' })
  }, [isLoading])

  // Auto-scroll to bottom when new messages arrive and user is already at bottom
  useEffect(() => {
    if (!atBottomRef.current || isFetchingNextPage || listItems.length === 0) return
    rowVirtualizer.scrollToIndex(listItems.length - 1, { align: 'end' })
  }, [allMessages.length])

  // Emit message:read for the most recent message when user is at bottom
  useEffect(() => {
    if (!currentUserId || allMessages.length === 0) return
    const lastMsg = allMessages[allMessages.length - 1]
    if (!lastMsg || lastMsg.id === lastEmittedReadRef.current) return

    // Only emit when visible (at bottom) and for messages from others
    if (!atBottomRef.current) return

    const socket = getSocket()
    if (!socket) return
    socket.emit('message:read', { messageId: lastMsg.id, channelId })
    lastEmittedReadRef.current = lastMsg.id
  }, [allMessages.length, currentUserId, channelId])

  // Socket: receive new messages → add to cache
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    function onMessageReceive(message: Message) {
      if (message.channelId !== channelId) return
      // Thread replies are handled by ThreadPanel — skip them here
      if (message.threadId !== null) return
      queryClient.setQueryData(
        ['messages', channelId],
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          const pages = old.pages.map((page, idx) => {
            // pages[0] holds the most recent messages — always insert new messages there
            if (idx !== 0) return page
            const alreadyExists = page.messages.some(m => m.id === message.id)
            if (alreadyExists) return page
            return { ...page, messages: [...page.messages, message] }
          })
          return { ...old, pages }
        }
      )
    }

    function onReadUpdate(data: ReadReceiptUser & { channelId: string }) {
      if (data.channelId !== channelId) return
      // Don't show own read receipt on own messages
      if (data.userId === currentUserId) return
      setReadReceipts(prev => {
        const next = new Map(prev)
        const existing = next.get(data.messageId) ?? []
        if (existing.some(r => r.userId === data.userId)) return prev
        next.set(data.messageId, [...existing, data])
        return next
      })
    }

    socket.on('message:receive', onMessageReceive)
    socket.on('read:update', onReadUpdate)
    return () => {
      socket.off('message:receive', onMessageReceive)
      socket.off('read:update', onReadUpdate)
    }
  }, [channelId, currentUserId, queryClient])

  // Clear receipts when channel changes
  useEffect(() => {
    setReadReceipts(new Map())
    lastEmittedReadRef.current = null
  }, [channelId])

  if (isLoading) {
    return (
      <div className='flex flex-1 items-center justify-center'>
        <div className='h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary' />
      </div>
    )
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div ref={parentRef} onScroll={handleScroll} className='flex-1 overflow-y-auto' style={{ contain: 'strict' }}>
        {isFetchingNextPage && (
          <div className='flex justify-center py-2'>
            <div className='h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary' />
          </div>
        )}

        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualItem => {
            const item = listItems[virtualItem.index]
            if (!item) return null

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`
                }}
              >
                {item.kind === 'date-separator' ? (
                  <div className='flex items-center gap-3 px-4 py-2'>
                    <div className='h-px flex-1 bg-border' />
                    <span className='font-medium text-muted-foreground text-xs'>{item.label}</span>
                    <div className='h-px flex-1 bg-border' />
                  </div>
                ) : (
                  <MessageBubble
                    message={item.message}
                    isCurrentUser={item.message.senderId === currentUserId}
                    currentUserId={currentUserId}
                    showAvatar={item.showAvatar}
                    readBy={readReceipts.get(item.message.id)}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <TypingIndicator channelId={channelId} currentUserId={currentUserId} />
    </div>
  )
}
