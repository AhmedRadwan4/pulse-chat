import { Socket } from 'socket.io'
import { pool } from '../db'

export interface AuthUser {
  id: string
  name: string
  email: string
  username: string | null
  image: string | null
  role: string | null
}

declare module 'socket.io' {
  interface SocketData {
    user: AuthUser
  }
}

export async function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined

  if (!token) {
    return next(new Error('Unauthorized: no token provided'))
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        s."expiresAt",
        u."id", u."name", u."email", u."username", u."image", u."role", u."banned"
       FROM "session" s
       JOIN "user" u ON u."id" = s."userId"
       WHERE s."token" = $1
       LIMIT 1`,
      [token]
    )

    const row = rows[0]

    if (!row) {
      return next(new Error('Unauthorized: invalid session token'))
    }

    if (new Date(row.expiresAt) < new Date()) {
      return next(new Error('Unauthorized: session expired'))
    }

    if (row.banned) {
      return next(new Error('Forbidden: account is banned'))
    }

    socket.data.user = {
      id: row.id,
      name: row.name,
      email: row.email,
      username: row.username,
      image: row.image,
      role: row.role
    }

    next()
  } catch (err) {
    console.error('[Auth Middleware] Error validating session:', err)
    next(new Error('Unauthorized: internal error'))
  }
}
