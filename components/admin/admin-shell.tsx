'use client'

import {
  IconChartBar,
  IconHash,
  IconLayoutSidebar,
  IconLogout,
  IconMessageCircle,
  IconUsers
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { authClient } from '@/lib/auth-client'
import type { AuthUser } from '@/lib/session'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: IconChartBar },
  { href: '/admin/users', label: 'Users', icon: IconUsers },
  { href: '/admin/channels', label: 'Channels', icon: IconHash }
]

interface AdminShellProps {
  user: AuthUser
  children: React.ReactNode
}

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname()

  return (
    <div className='flex h-screen overflow-hidden bg-background'>
      <aside className='flex w-56 shrink-0 flex-col border-border border-r bg-muted/30'>
        {/* Header */}
        <div className='flex items-center gap-2 px-4 py-4'>
          <IconLayoutSidebar className='size-5 text-primary' />
          <span className='font-semibold text-sm'>Admin Panel</span>
        </div>

        <Separator />

        {/* Nav */}
        <nav className='flex flex-1 flex-col gap-1 p-2'>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                ].join(' ')}
              >
                <Icon className='size-4 shrink-0' />
                {label}
              </Link>
            )
          })}
        </nav>

        <Separator />

        {/* Footer */}
        <div className='flex flex-col gap-1 p-2'>
          <Link
            href='/chat'
            className='flex items-center gap-2.5 rounded-md px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground'
          >
            <IconMessageCircle className='size-4 shrink-0' />
            Back to Chat
          </Link>

          <button
            type='button'
            onClick={() => authClient.signOut()}
            className='flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground'
          >
            <IconLogout className='size-4 shrink-0' />
            Sign out
          </button>

          <div className='mt-1 flex items-center gap-2 rounded-md px-3 py-2'>
            <Avatar className='size-6'>
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className='text-xs'>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className='min-w-0'>
              <p className='truncate font-medium text-xs'>{user.name}</p>
              <p className='truncate text-muted-foreground text-xs'>{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className='flex min-w-0 flex-1 flex-col overflow-auto'>{children}</main>
    </div>
  )
}
