import { create } from 'zustand'

interface UserPresence {
  status: string
  lastSeen: string
}

interface PresenceState {
  onlineUsers: Map<string, UserPresence>
  setUserPresence: (userId: string, data: UserPresence) => void
  removeUser: (userId: string) => void
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: new Map(),

  setUserPresence: (userId, data) => {
    const next = new Map(get().onlineUsers)
    next.set(userId, data)
    set({ onlineUsers: next })
  },

  removeUser: userId => {
    const next = new Map(get().onlineUsers)
    next.delete(userId)
    set({ onlineUsers: next })
  }
}))
