'use client'

import { IconBell, IconLogout, IconSelector, IconUser } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { authClient } from '@/lib/auth-client'

export function NavUser({
  user
}: {
  user: {
    name: string
    email: string
    image?: string | null
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/auth/signin')
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size='lg' className='aria-expanded:bg-muted' />}>
            <Avatar className='size-8 rounded-lg'>
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback className='rounded-lg'>{initials}</AvatarFallback>
            </Avatar>
            <div className='grid flex-1 text-start text-sm leading-tight'>
              <span className='truncate font-medium'>{user.name}</span>
              <span className='truncate text-muted-foreground text-xs'>{user.email}</span>
            </div>
            <IconSelector className='ms-auto size-4' />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-start text-sm'>
                <Avatar className='size-8 rounded-lg'>
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className='rounded-lg'>{initials}</AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-medium'>{user.name}</span>
                  <span className='truncate text-muted-foreground text-xs'>{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <IconUser />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconBell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <IconLogout />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
