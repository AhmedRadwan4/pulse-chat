'use client'

import * as React from 'react'
import { NavLinks } from '@/components/dashboard/nav-links'
import { NavUser } from '@/components/dashboard/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@/components/ui/sidebar'
import type { NavGroup } from './nav-links'

export interface PortalUser {
  name: string
  email: string
  image?: string | null
}

export interface PortalSidebarProps extends React.ComponentProps<typeof Sidebar> {
  portalName: string
  portalInitial: string // single letter shown in the icon square
  portalLabel: string // subtitle under the name e.g. "Platform administration"
  navGroups: NavGroup[]
  user: PortalUser
}

export function PortalSidebar({
  portalName,
  portalInitial,
  portalLabel,
  navGroups,
  user,
  ...props
}: PortalSidebarProps) {
  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' className='pointer-events-none select-none'>
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary font-semibold text-sidebar-primary-foreground text-sm'>
                {portalInitial}
              </div>
              <div className='grid flex-1 text-start text-sm leading-tight'>
                <span className='truncate font-semibold'>{portalName}</span>
                <span className='truncate text-sidebar-foreground/60 text-xs'>{portalLabel}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group, i) => (
          <NavLinks key={group.label ?? i} label={group.label} items={group.items} />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
