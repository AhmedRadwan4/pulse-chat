/**
 * Data Access Layer (DAL) — server-only session utilities.
 * Import only in Server Components, Server Actions, and Route Handlers.
 */
import 'server-only'

import { headers } from 'next/headers'
import { forbidden, unauthorized } from 'next/navigation'
import { auth } from '@/lib/auth'

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getServerUser>>>

// ─── Core session fetch ───────────────────────────────────────────────────────

export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function getServerUser() {
  const session = await getServerSession()
  if (!session) return null
  return session.user
}

// ─── Guards ───────────────────────────────────────────────────────────────────

export async function requireAuth(): Promise<AuthUser> {
  const user = await getServerUser()
  if (!user) unauthorized()
  return user
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.role !== 'admin') forbidden()
  return user
}
