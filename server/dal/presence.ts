import redis from '../redis'

const PRESENCE_TTL = 3600 // 1 hour — explicit setOffline on disconnect; TTL is safety net for crashes

export async function setOnline(userId: string, channelIds: string[]) {
  const payload = JSON.stringify({ status: 'online', lastSeen: new Date().toISOString() })

  const pipeline = redis.pipeline()
  pipeline.set(`presence:user:${userId}`, payload, 'EX', PRESENCE_TTL)
  for (const channelId of channelIds) {
    pipeline.sadd(`presence:channel:${channelId}`, userId)
  }
  await pipeline.exec()
}

export async function setOffline(userId: string, channelIds: string[]) {
  const pipeline = redis.pipeline()
  pipeline.del(`presence:user:${userId}`)
  for (const channelId of channelIds) {
    pipeline.srem(`presence:channel:${channelId}`, userId)
  }
  await pipeline.exec()
}

export async function getOnlineUsers(channelId: string): Promise<string[]> {
  return redis.smembers(`presence:channel:${channelId}`)
}

export async function getUserPresence(userId: string): Promise<{ status: string; lastSeen: string } | null> {
  const raw = await redis.get(`presence:user:${userId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as { status: string; lastSeen: string }
  } catch {
    return null
  }
}

export async function setAway(userId: string) {
  const raw = await redis.get(`presence:user:${userId}`)
  if (!raw) return
  const payload = JSON.stringify({ status: 'away', lastSeen: new Date().toISOString() })
  await redis.set(`presence:user:${userId}`, payload, 'EX', PRESENCE_TTL)
}

export async function refreshPresence(userId: string) {
  const raw = await redis.get(`presence:user:${userId}`)
  if (raw) {
    await redis.expire(`presence:user:${userId}`, PRESENCE_TTL)
  }
}
