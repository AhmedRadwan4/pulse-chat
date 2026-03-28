import type { AttachmentInput } from './types'

// ---------------------------------------------------------------------------
// Socket.IO event name constants
// Use these instead of raw strings to prevent typos across client and server.
// ---------------------------------------------------------------------------

/** Events emitted by the client, handled by the server */
export const CLIENT_EVENTS = {
  MESSAGE_NEW: 'message:new',
  MESSAGE_EDIT: 'message:edit',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_READ: 'message:read',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  REACTION_ADD: 'reaction:add',
  REACTION_REMOVE: 'reaction:remove',
  CHANNEL_JOIN: 'channel:join',
  CHANNEL_LEAVE: 'channel:leave',
  THREAD_REPLY: 'thread:reply',
  THREAD_SUBSCRIBE: 'thread:subscribe',
  PRESENCE_AWAY: 'presence:away',
  PRESENCE_BACK: 'presence:back'
} as const

/** Events emitted by the server, received by the client */
export const SERVER_EVENTS = {
  MESSAGE_RECEIVE: 'message:receive',
  MESSAGE_EDITED: 'message:edited',
  MESSAGE_DELETED: 'message:deleted',
  TYPING_UPDATE: 'typing:update',
  REACTION_UPDATE: 'reaction:update',
  CHANNEL_JOINED: 'channel:joined',
  CHANNEL_LEFT: 'channel:left',
  CHANNEL_MODE_CHANGED: 'channel:mode-changed',
  PRESENCE_UPDATE: 'presence:update',
  PRESENCE_INIT: 'presence:init',
  THREAD_RECEIVE: 'thread:receive',
  THREAD_SUBSCRIBED: 'thread:subscribed',
  NOTIFICATION_NEW: 'notification:new',
  READ_UPDATE: 'read:update',
  ERROR: 'error'
} as const

export type ClientEvent = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS]
export type ServerEvent = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS]

// ---------------------------------------------------------------------------
// Client → Server payload types
// ---------------------------------------------------------------------------

export type MessageNewPayload = {
  channelId: string
  content?: string
  attachments?: AttachmentInput[]
  threadId?: string
}

export type MessageEditPayload = {
  messageId: string
  content: string
}

export type MessageDeletePayload = {
  messageId: string
}

export type MessageReadPayload = {
  messageId: string
  channelId: string
}

export type TypingPayload = {
  channelId: string
}

export type ReactionAddPayload = {
  messageId: string
  emoji: string
}

export type ReactionRemovePayload = {
  messageId: string
  emoji: string
}

export type ChannelJoinPayload = {
  channelId: string
}

export type ChannelLeavePayload = {
  channelId: string
}

export type ThreadReplyPayload = {
  threadId: string
  content: string
  attachments?: AttachmentInput[]
}

export type ThreadSubscribePayload = {
  threadId: string
}

// ---------------------------------------------------------------------------
// Server → Client payload types
// ---------------------------------------------------------------------------

export type MessageEditedPayload = {
  messageId: string
  content: string
  editedAt: string
}

export type MessageDeletedPayload = {
  messageId: string
}

export type TypingUpdatePayload = {
  channelId: string
  typingUsers: { id: string; name: string }[]
}

export type ReactionUpdatePayload = {
  messageId: string
  reactions: { emoji: string; count: number; userIds: string[] }[]
}

export type ChannelModeChangedPayload = {
  channelId: string
  mode: 'MONITORED' | 'E2E_ENCRYPTED'
  changedBy: string
  changedAt: string
}

export type ReadUpdatePayload = {
  messageId: string
  channelId: string
  userId: string
  userName: string
  userImage: string | null
  readAt: string
}

export type SocketErrorPayload = {
  event: string
  message: string
}
