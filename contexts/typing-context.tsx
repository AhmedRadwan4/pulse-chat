'use client'

import { createContext, useContext } from 'react'

export type TypingUser = { id: string; name: string }
export type TypingMap = Map<string, TypingUser[]>

interface TypingContextValue {
  typingUsers: TypingMap
}

export const TypingContext = createContext<TypingContextValue>({
  typingUsers: new Map()
})

export function useTypingContext() {
  return useContext(TypingContext)
}
