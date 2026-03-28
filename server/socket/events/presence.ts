import { Server, Socket } from 'socket.io'
import { getUserChannels } from '../../dal/channels'
import { getOnlineUsers, getUserPresence, setAway, setOffline, setOnline } from '../../dal/presence'
import { clearTypingForUser } from './typing'

export async function registerPresenceHandlers(socket: Socket, io: Server) {
  const user = socket.data.user
  // Declared here so presence:away / presence:back handlers can access it
  let channelIds: string[] = []

  try {
    // Fetch all channels the user belongs to
    const channels = await getUserChannels(user.id)
    channelIds = channels.map(c => c.id)

    // Join personal room for targeted notifications
    await socket.join(`user:${user.id}`)

    // Join all channel rooms
    for (const channelId of channelIds) {
      await socket.join(`channel:${channelId}`)
    }

    // Mark user online in Redis
    await setOnline(user.id, channelIds)

    // Broadcast online status to all channel rooms the user is in
    const presencePayload = {
      userId: user.id,
      status: 'online',
      lastSeen: new Date().toISOString()
    }

    for (const channelId of channelIds) {
      socket.to(`channel:${channelId}`).emit('presence:update', presencePayload)
    }
    // Store channel IDs on socket for use during disconnect
    ;(socket as unknown as { _channelIds: string[] })._channelIds = channelIds

    // Emit initial presence snapshot so the connecting user knows who is online
    const seen = new Set<string>()
    const snapshot: { userId: string; status: string; lastSeen: string }[] = []
    for (const channelId of channelIds) {
      const onlineIds = await getOnlineUsers(channelId)
      for (const userId of onlineIds) {
        if (userId === user.id || seen.has(userId)) continue
        seen.add(userId)
        const presence = await getUserPresence(userId)
        if (presence) snapshot.push({ userId, ...presence })
      }
    }
    if (snapshot.length > 0) {
      socket.emit('presence:init', snapshot)
    }
  } catch (err) {
    console.error('[presence] Error during connect setup:', err)
  }

  socket.on('presence:away', async () => {
    try {
      await setAway(user.id)
      const payload = { userId: user.id, status: 'away', lastSeen: new Date().toISOString() }
      for (const channelId of channelIds) {
        socket.to(`channel:${channelId}`).emit('presence:update', payload)
      }
    } catch (err) {
      console.error('[presence] Error setting away:', err)
    }
  })

  socket.on('presence:back', async () => {
    try {
      await setOnline(user.id, channelIds)
      const payload = { userId: user.id, status: 'online', lastSeen: new Date().toISOString() }
      for (const channelId of channelIds) {
        socket.to(`channel:${channelId}`).emit('presence:update', payload)
      }
    } catch (err) {
      console.error('[presence] Error setting back online:', err)
    }
  })

  socket.on('disconnect', async () => {
    try {
      const channelIds: string[] = (socket as unknown as { _channelIds?: string[] })._channelIds ?? []

      // Clear typing indicators
      await clearTypingForUser(user.id, channelIds)

      // Mark user offline in Redis
      await setOffline(user.id, channelIds)

      const presencePayload = {
        userId: user.id,
        status: 'offline',
        lastSeen: new Date().toISOString()
      }

      // Broadcast offline status to channel rooms
      for (const channelId of channelIds) {
        socket.to(`channel:${channelId}`).emit('presence:update', presencePayload)
      }
    } catch (err) {
      console.error('[presence] Error during disconnect cleanup:', err)
    }
  })
}
