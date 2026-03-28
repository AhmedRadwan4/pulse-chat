// Domain types shared between the Next.js frontend and the Socket.IO server

export type ChannelType = 'PUBLIC' | 'PRIVATE' | 'DIRECT'
export type ChannelMode = 'MONITORED' | 'E2E_ENCRYPTED'
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type AttachmentType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO'
export type NotificationType = 'MENTION' | 'DIRECT_MESSAGE' | 'THREAD_REPLY'

export type Channel = {
  id: string
  name: string | null
  description: string | null
  type: ChannelType
  mode: ChannelMode
  modeChangedAt: string | null
  modeChangedBy: string | null
  createdById: string
  createdAt: string
  _count?: { members: number; messages: number }
}

export type Attachment = {
  id: string
  url: string
  type: AttachmentType
  name: string
  size: number
}

/** Attachment payload sent by the client when creating a message (no id yet) */
export type AttachmentInput = {
  url: string
  type: AttachmentType
  name: string
  size: number
}

export type Message = {
  id: string
  channelId: string
  senderId: string
  content: string | null
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
  threadId: string | null
  sender: { id: string; name: string; username: string | null; image: string | null }
  attachments: Attachment[]
  reactions: { emoji: string; count: number; userIds: string[] }[]
}

export type ReadReceiptUser = {
  messageId: string
  userId: string
  userName: string
  userImage: string | null
  readAt: string
}

export type Member = {
  userId: string
  channelId: string
  role: MemberRole
  joinedAt: string
  user: { id: string; name: string; username: string | null; image: string | null }
}

export type AppNotification = {
  id: string
  type: NotificationType
  actorId: string
  actorName: string
  actorImage: string | null
  channelId: string | null
  messageId: string | null
  body: string | null
  read: boolean
  createdAt: string
}

export type PresenceStatus = 'online' | 'offline'

export type PresencePayload = {
  userId: string
  status: PresenceStatus
  lastSeen: string
}
