'use client'

import { usePathname } from 'next/navigation'
import { usePermissions } from '@/components/auth/permissions-provider'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'

export interface NavLinkItem {
  title: string
  url: string
  icon: React.ReactNode
  /** Permission slug — item is hidden unless the user has `read` on this subject. */
  permission?: string
}

export interface NavGroup {
  label?: string
  items: NavLinkItem[]
}

function isRouteActive(url: string, pathname: string): boolean {
  if (url === '/portal') return pathname === '/portal'
  return pathname === url || pathname.startsWith(url + '/')
}

export function NavLinks({ label, items }: { label?: string; items: NavLinkItem[] }) {
  const pathname = usePathname()
  const permissions = usePermissions()

  const visible = items.filter(item => {
    if (!item.permission) return true
    return permissions[item.permission]?.read ?? false
  })

  if (visible.length === 0) return null

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {visible.map(item => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              render={<a href={item.url} />}
              tooltip={item.title}
              isActive={isRouteActive(item.url, pathname)}
            >
              {item.icon}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
