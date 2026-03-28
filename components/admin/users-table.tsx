'use client'

import {
  IconBan,
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconEyeOff,
  IconSearch,
  IconShield,
  IconShieldOff,
  IconTrash,
  IconUserMinus,
  IconUserPlus
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/axios'

interface AdminUser {
  id: string
  name: string
  email: string
  username: string | null
  image: string | null
  role: string | null
  banned: boolean
  banReason: string | null
  banExpires: string | null
  discoverable: boolean
  createdAt: string
}

interface UsersResponse {
  users: AdminUser[]
  total: number
  page: number
  limit: number
}

type PendingAction =
  | { type: 'promote'; user: AdminUser }
  | { type: 'demote'; user: AdminUser }
  | { type: 'ban'; user: AdminUser }
  | { type: 'unban'; user: AdminUser }
  | { type: 'delete'; user: AdminUser }
  | { type: 'hide'; user: AdminUser }
  | { type: 'unhide'; user: AdminUser }

export function UsersTable() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [banReason, setBanReason] = useState('')
  const limit = 20

  const { data, isPending } = useQuery({
    queryKey: ['admin', 'users', page, debouncedSearch],
    queryFn: async () => {
      const res = await api.get<UsersResponse>('/api/admin/users', {
        params: { page, limit, search: debouncedSearch }
      })
      return res.data
    }
  })

  const mutation = useMutation({
    mutationFn: async (action: PendingAction) => {
      if (action.type === 'delete') {
        await api.delete(`/api/admin/users/${action.user.id}`)
      } else if (action.type === 'promote') {
        await api.patch(`/api/admin/users/${action.user.id}`, { role: 'admin' })
      } else if (action.type === 'demote') {
        await api.patch(`/api/admin/users/${action.user.id}`, { role: 'user' })
      } else if (action.type === 'ban') {
        await api.patch(`/api/admin/users/${action.user.id}`, {
          banned: true,
          banReason: banReason || null
        })
      } else if (action.type === 'unban') {
        await api.patch(`/api/admin/users/${action.user.id}`, { banned: false })
      } else if (action.type === 'hide') {
        await api.patch(`/api/admin/users/${action.user.id}`, { discoverable: false })
      } else if (action.type === 'unhide') {
        await api.patch(`/api/admin/users/${action.user.id}`, { discoverable: true })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      setPending(null)
      setBanReason('')
    }
  })

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
    // Simple debounce via timeout pattern — good enough for a table filter
    const t = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(t)
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1

  return (
    <>
      <div className='space-y-4'>
        <div className='flex items-center gap-2'>
          <div className='relative max-w-sm'>
            <IconSearch className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search users…'
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className='pl-8'
            />
          </div>
          {data && <span className='ml-auto text-muted-foreground text-sm'>{data.total.toLocaleString()} users</span>}
        </div>

        <div className='overflow-hidden rounded-lg border border-border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className='w-10' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className='h-4 animate-pulse rounded bg-muted' />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isPending && data?.users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className='py-8 text-center text-muted-foreground'>
                    No users found
                  </TableCell>
                </TableRow>
              )}

              {!isPending &&
                data?.users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className='flex items-center gap-2.5'>
                        <Avatar className='size-7 shrink-0'>
                          <AvatarImage src={user.image ?? undefined} />
                          <AvatarFallback className='text-xs'>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className='min-w-0'>
                          <p className='truncate font-medium text-sm'>{user.name}</p>
                          <p className='truncate text-muted-foreground text-xs'>{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className='text-xs'>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex flex-wrap gap-1'>
                        {user.banned ? (
                          <Badge variant='destructive' className='gap-1 text-xs'>
                            <IconBan className='size-3' />
                            Banned
                          </Badge>
                        ) : (
                          <Badge variant='outline' className='border-emerald-300 text-emerald-600 text-xs'>
                            Active
                          </Badge>
                        )}
                        {!user.discoverable && (
                          <Badge variant='outline' className='gap-1 text-muted-foreground text-xs'>
                            <IconEyeOff className='size-3' />
                            Hidden
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='whitespace-nowrap text-muted-foreground text-sm'>
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant='ghost' size='icon' className='size-7' />}>
                          <span className='sr-only'>Actions</span>
                          <svg viewBox='0 0 16 16' fill='currentColor' className='size-4 text-muted-foreground'>
                            <circle cx='8' cy='3' r='1.2' />
                            <circle cx='8' cy='8' r='1.2' />
                            <circle cx='8' cy='13' r='1.2' />
                          </svg>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          {user.role !== 'admin' ? (
                            <DropdownMenuItem onClick={() => setPending({ type: 'promote', user })}>
                              <IconShield className='mr-2 size-4' />
                              Promote to admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setPending({ type: 'demote', user })}>
                              <IconShieldOff className='mr-2 size-4' />
                              Remove admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {user.banned ? (
                            <DropdownMenuItem onClick={() => setPending({ type: 'unban', user })}>
                              <IconUserPlus className='mr-2 size-4' />
                              Unban
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className='text-amber-600'
                              onClick={() => setPending({ type: 'ban', user })}
                            >
                              <IconUserMinus className='mr-2 size-4' />
                              Ban
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {user.discoverable ? (
                            <DropdownMenuItem onClick={() => setPending({ type: 'hide', user })}>
                              <IconEyeOff className='mr-2 size-4' />
                              Hide from search
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setPending({ type: 'unhide', user })}>
                              <IconEye className='mr-2 size-4' />
                              Make discoverable
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className='text-destructive'
                            onClick={() => setPending({ type: 'delete', user })}
                          >
                            <IconTrash className='mr-2 size-4' />
                            Delete account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className='flex items-center justify-end gap-2'>
            <Button
              variant='outline'
              size='icon'
              className='size-8'
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <IconChevronLeft className='size-4' />
            </Button>
            <span className='text-muted-foreground text-sm'>
              {page} / {totalPages}
            </span>
            <Button
              variant='outline'
              size='icon'
              className='size-8'
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <IconChevronRight className='size-4' />
            </Button>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={!!pending}
        onOpenChange={open => {
          if (!open) {
            setPending(null)
            setBanReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.type === 'delete' && 'Delete account'}
              {pending?.type === 'ban' && 'Ban user'}
              {pending?.type === 'unban' && 'Unban user'}
              {pending?.type === 'promote' && 'Promote to admin'}
              {pending?.type === 'demote' && 'Remove admin role'}
              {pending?.type === 'hide' && 'Hide from search'}
              {pending?.type === 'unhide' && 'Make discoverable'}
            </DialogTitle>
          </DialogHeader>

          <div className='text-muted-foreground text-sm'>
            {pending?.type === 'delete' && (
              <p>
                Permanently delete <strong className='text-foreground'>{pending.user.name}</strong>? This cannot be
                undone.
              </p>
            )}
            {pending?.type === 'ban' && (
              <div className='space-y-3'>
                <p>
                  Ban <strong className='text-foreground'>{pending.user.name}</strong>?
                </p>
                <div className='space-y-1'>
                  <label className='font-medium text-foreground text-xs' htmlFor='ban-reason'>
                    Reason <span className='font-normal text-muted-foreground'>(optional)</span>
                  </label>
                  <Input
                    id='ban-reason'
                    placeholder='Explain why…'
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                  />
                </div>
              </div>
            )}
            {pending?.type === 'unban' && (
              <p>
                Remove the ban on <strong className='text-foreground'>{pending.user.name}</strong>?
              </p>
            )}
            {pending?.type === 'promote' && (
              <p>
                Give <strong className='text-foreground'>{pending.user.name}</strong> admin access?
              </p>
            )}
            {pending?.type === 'demote' && (
              <p>
                Remove admin role from <strong className='text-foreground'>{pending.user.name}</strong>?
              </p>
            )}
            {pending?.type === 'hide' && (
              <p>
                Hide <strong className='text-foreground'>{pending.user.name}</strong> from user search? They will no
                longer appear in the DM user picker for other users.
              </p>
            )}
            {pending?.type === 'unhide' && (
              <p>
                Make <strong className='text-foreground'>{pending.user.name}</strong> discoverable again? They will
                appear in the DM user picker for other users.
              </p>
            )}
          </div>

          {mutation.error && <p className='text-destructive text-xs'>{(mutation.error as Error).message}</p>}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setPending(null)
                setBanReason('')
              }}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={pending?.type === 'delete' || pending?.type === 'ban' ? 'destructive' : 'default'}
              onClick={() => pending && mutation.mutate(pending)}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
