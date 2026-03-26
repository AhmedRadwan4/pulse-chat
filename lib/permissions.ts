/**
 * Shared permission utilities — usable on both server and client.
 * This module has no server-only imports; it is safe to import anywhere.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Action = 'read' | 'write' | 'create' | 'delete'

export type PermissionEntry = {
  read: boolean
  write: boolean
  create: boolean
  delete: boolean
}

/**
 * Merged permission map keyed by permission slug.
 * Example: { users: { read: true, write: false, create: false, delete: false } }
 */
export type PermissionMap = Record<string, PermissionEntry>

// ─── Core utility ─────────────────────────────────────────────────────────────

/**
 * Returns true if the user has the given action on the given subject.
 *
 * @example
 * can(user, 'read', 'users')   // true / false
 * can(user, 'delete', 'wallet') // true / false
 */
export function can(user: { permissions: PermissionMap }, action: Action, subject: string): boolean {
  return user.permissions[subject]?.[action] ?? false
}
