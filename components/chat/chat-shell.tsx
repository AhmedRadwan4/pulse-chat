'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { ChannelList } from '@/components/chat/channel-list'
import { TypingContext, type TypingMap, type TypingUser } from '@/contexts/typing-context'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/axios'
import type { AuthUser } from '@/lib/session'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { useChatStore } from '@/store/chat'
import { useNotificationStore } from '@/store/notifications'
import { usePresenceStore } from '@/store/presence'
import type { AppNotification } from '@/types/db'

interface ChatShellProps {
  user: AuthUser
  children: React.ReactNode
}

export function ChatShell({ user, children }: ChatShellProps) {
  const queryClient = useQueryClient()
  const sidebarOpen = useChatStore(s => s.sidebarOpen)
  const setUserPresence = usePresenceStore(s => s.setUserPresence)
  const removeUser = usePresenceStore(s => s.removeUser)
  const [typingUsers, setTypingUsers] = useState<TypingMap>(new Map())
  const socketInitialized = useRef(false)

  useEffect(() => {
    if (socketInitialized.current) return
    socketInitialized.current = true

    // Away / idle detection — defined here so the cleanup closure can reach them
    const IDLE_MS = 5 * 60 * 1000 // 5 minutes of no activity → away
    let idleTimer: ReturnType<typeof setTimeout> | null = null
    let isAway = false
    let socketReady = false

    function goAway() {
      if (isAway || !socketReady) return
      isAway = true
      getSocket()?.emit('presence:away')
    }

    function comeBack() {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(goAway, IDLE_MS)
      if (!isAway || !socketReady) return
      isAway = false
      getSocket()?.emit('presence:back')
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        goAway()
      } else {
        comeBack()
      }
    }

    const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'pointerdown', 'scroll'] as const
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, comeBack, { passive: true })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    idleTimer = setTimeout(goAway, IDLE_MS)

    async function initSocket() {
      const session = await authClient.getSession()
      // Better Auth returns { data: { session: { token }, user } }
      const token = session?.data?.session?.token ?? ''
      const socket = await connectSocket(token)
      socketReady = true

      socket.on('presence:update', (data: { userId: string; status: string; lastSeen: string }) => {
        if (data.status === 'offline') {
          removeUser(data.userId)
        } else {
          setUserPresence(data.userId, { status: data.status, lastSeen: data.lastSeen })
        }
      })

      socket.on('message:receive', (message: { channelId: string }) => {
        queryClient.invalidateQueries({ queryKey: ['messages', message.channelId] })
      })

      socket.on('message:edited', (data: { messageId: string; channelId?: string }) => {
        if (data.channelId) {
          queryClient.invalidateQueries({ queryKey: ['messages', data.channelId] })
        }
      })

      socket.on('message:deleted', (data: { messageId: string; channelId?: string }) => {
        if (data.channelId) {
          queryClient.invalidateQueries({ queryKey: ['messages', data.channelId] })
        }
      })

      socket.on('presence:init', (users: { userId: string; status: string; lastSeen: string }[]) => {
        for (const u of users) {
          setUserPresence(u.userId, { status: u.status, lastSeen: u.lastSeen })
        }
      })

      socket.on('typing:update', (data: { channelId: string; typingUsers: TypingUser[] }) => {
        setTypingUsers(prev => {
          const next = new Map(prev)
          if (data.typingUsers.length === 0) {
            next.delete(data.channelId)
          } else {
            next.set(data.channelId, data.typingUsers)
          }
          return next
        })
      })

      socket.on('notification:new', (notif: AppNotification) => {
        useNotificationStore.getState().addNotification(notif)
      })

      socket.on('channel:mode-changed', (data: { channelId: string }) => {
        queryClient.invalidateQueries({ queryKey: ['channel', data.channelId] })
        queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
      })

      type ReactionEntry = { emoji: string; count: number; users: { id: string; name: string; username: string | null }[] }
      socket.on('reaction:update', (data: { messageId: string; channelId: string; reactions: ReactionEntry[] }) => {
        const mapped = data.reactions.map(r => ({ emoji: r.emoji, count: r.count, userIds: r.users.map(u => u.id) }))
        queryClient.setQueryData(
          ['messages', data.channelId],
          (old: { pages: { messages: { id: string; reactions: unknown[] }[] }[]; pageParams: unknown[] } | undefined) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map(page => ({
                ...page,
                messages: page.messages.map(m => (m.id === data.messageId ? { ...m, reactions: mapped } : m))
              }))
            }
          }
        )
      })

      // Load initial notifications into the store
      api
        .get<{ notifications: AppNotification[]; unreadCount: number }>('/api/notifications?limit=30')
        .then(res => {
          useNotificationStore.getState().setNotifications(res.data.notifications, res.data.unreadCount)
        })
        .catch(() => {
          // Non-critical — notifications will load when the panel opens
        })
    }

    initSocket()

    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, comeBack)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (idleTimer) clearTimeout(idleTimer)
      disconnectSocket()
    }
  }, [])

  return (
    <TypingContext.Provider value={{ typingUsers }}>
      <div className='flex h-screen overflow-hidden bg-background'>
        <aside
          className={[
            'flex w-64 shrink-0 flex-col border-border border-r bg-muted/30 transition-all duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            'fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0'
          ].join(' ')}
        >
          <ChannelList user={user} />
        </aside>

        {sidebarOpen && (
          <div
            className='fixed inset-0 z-30 bg-black/40 md:hidden'
            onClick={() => useChatStore.getState().toggleSidebar()}
          />
        )}

        <main className='flex min-w-0 flex-1 flex-col overflow-hidden'>{children}</main>
      </div>
    </TypingContext.Provider>
  )
}
