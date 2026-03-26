'use client'

import { NotificationBell } from '@/components/portal/notifications/NotificationBell'
import { ModeToggle } from '@/components/shared/ThemeSwitch'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

interface PortalShellProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function PortalShell({ sidebar, children }: PortalShellProps) {
  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset>
        <header className='flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4'>
          <div className='flex items-center gap-1'>
            <SidebarTrigger className='-ms-1' />
            <Separator orientation='vertical' className='me-2 data-vertical:h-4 data-vertical:self-auto' />
          </div>
          <div className='flex items-center gap-1'>
            <NotificationBell />
            <ModeToggle />
          </div>
        </header>
        <main className='flex flex-1 flex-col'>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
