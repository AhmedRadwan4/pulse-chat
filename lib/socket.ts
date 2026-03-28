'use client'

import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export async function connectSocket(token: string): Promise<Socket> {
  if (socket?.connected) return socket

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling']
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
