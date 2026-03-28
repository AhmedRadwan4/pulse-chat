import { create } from 'zustand'

interface ChatState {
  activeChannelId: string | null
  setActiveChannel: (id: string | null) => void

  drafts: Record<string, string>
  setDraft: (channelId: string, content: string) => void

  openThreadId: string | null
  setOpenThread: (id: string | null) => void

  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useChatStore = create<ChatState>(set => ({
  activeChannelId: null,
  setActiveChannel: id => set({ activeChannelId: id }),

  drafts: {},
  setDraft: (channelId, content) => set(state => ({ drafts: { ...state.drafts, [channelId]: content } })),

  openThreadId: null,
  setOpenThread: id => set({ openThreadId: id }),

  sidebarOpen: true,
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: open => set({ sidebarOpen: open })
}))
