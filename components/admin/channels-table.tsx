'use client'

import {
  IconChevronLeft,
  IconChevronRight,
  IconLock,
  IconMessage,
  IconSearch,
  IconShield,
  IconTrash,
  IconUsers,
  IconWorld
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { api } from '@/lib/axios'

interface AdminChannel {
  id: string
  name: string | null
  description: string | null
  type: 'PUBLIC' | 'PRIVATE' | 'DIRECT'
  mode: 'MONITORED' | 'E2E_ENCRYPTED'
  createdAt: string
  createdBy: { id: string; name: string; email: string }
  _count: { members: number; messages: number }
}

interface ChannelsResponse {
  channels: AdminChannel[]
  total: number
  page: number
  limit: number
}

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PUBLIC', label: 'Public' },
  { value: 'PRIVATE', label: 'Private' },
  { value: 'DIRECT', label: 'Direct' }
] as const

export function ChannelsTable() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'' | 'PUBLIC' | 'PRIVATE' | 'DIRECT'>('')
  const [deleteTarget, setDeleteTarget] = useState<AdminChannel | null>(null)
  const limit = 20

  const { data, isPending } = useQuery({
    queryKey: ['admin', 'channels', page, debouncedSearch, typeFilter],
    queryFn: async () => {
      const res = await api.get<ChannelsResponse>('/api/admin/channels', {
        params: { page, limit, search: debouncedSearch, type: typeFilter || undefined }
      })
      return res.data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/channels/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      setDeleteTarget(null)
    }
  })

  const toggleModeMutation = useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: 'MONITORED' | 'E2E_ENCRYPTED' }) => {
      await api.patch(`/api/channels/${id}/mode`, { mode })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
    }
  })

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
    const t = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(t)
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1

  return (
    <>
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='relative max-w-sm'>
            <IconSearch className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search channels…'
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className='pl-8'
            />
          </div>

          <div className='flex gap-1'>
            {TYPE_FILTERS.map(f => (
              <Button
                key={f.value}
                variant={typeFilter === f.value ? 'default' : 'outline'}
                size='sm'
                onClick={() => {
                  setTypeFilter(f.value)
                  setPage(1)
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {data && (
            <span className='ml-auto text-muted-foreground text-sm'>{data.total.toLocaleString()} channels</span>
          )}
        </div>

        <div className='overflow-hidden rounded-lg border border-border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className='w-10' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className='h-4 animate-pulse rounded bg-muted' />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isPending && data?.channels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className='py-8 text-center text-muted-foreground'>
                    No channels found
                  </TableCell>
                </TableRow>
              )}

              {!isPending &&
                data?.channels.map(channel => (
                  <TableRow key={channel.id}>
                    <TableCell>
                      <div className='flex items-center gap-1.5'>
                        {channel.type === 'PUBLIC' && <IconWorld className='size-3.5 shrink-0 text-muted-foreground' />}
                        {channel.type === 'PRIVATE' && <IconLock className='size-3.5 shrink-0 text-muted-foreground' />}
                        {channel.type === 'DIRECT' && (
                          <IconMessage className='size-3.5 shrink-0 text-muted-foreground' />
                        )}
                        <span className='font-medium text-sm'>{channel.name ?? 'Direct Message'}</span>
                      </div>
                      {channel.description && (
                        <p className='mt-0.5 max-w-48 truncate text-muted-foreground text-xs'>{channel.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          channel.type === 'PUBLIC' ? 'outline' : channel.type === 'PRIVATE' ? 'secondary' : 'default'
                        }
                        className='text-xs'
                      >
                        {channel.type === 'PUBLIC' && 'Public'}
                        {channel.type === 'PRIVATE' && 'Private'}
                        {channel.type === 'DIRECT' && 'DM'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {channel.type === 'DIRECT' ? (
                              <span className='flex items-center gap-1 text-emerald-600 text-xs dark:text-emerald-400'>
                                <IconLock className='size-3' />
                                E2E Encrypted
                              </span>
                            ) : (
                              <button
                                type='button'
                                disabled={toggleModeMutation.isPending}
                                onClick={() =>
                                  toggleModeMutation.mutate({
                                    id: channel.id,
                                    mode: channel.mode === 'MONITORED' ? 'E2E_ENCRYPTED' : 'MONITORED'
                                  })
                                }
                                className={[
                                  'flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors',
                                  channel.mode === 'MONITORED'
                                    ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400'
                                    : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
                                ].join(' ')}
                              >
                                {channel.mode === 'MONITORED' ? (
                                  <>
                                    <IconShield className='size-3' />
                                    Monitored
                                  </>
                                ) : (
                                  <>
                                    <IconLock className='size-3' />
                                    E2E Encrypted
                                  </>
                                )}
                              </button>
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            {channel.type === 'DIRECT'
                              ? 'DMs are always end-to-end encrypted'
                              : `Click to switch to ${channel.mode === 'MONITORED' ? 'E2E Encrypted' : 'Monitored'}`}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <span className='flex items-center gap-1 text-muted-foreground text-sm'>
                        <IconUsers className='size-3.5' />
                        {channel._count.members}
                      </span>
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {channel._count.messages.toLocaleString()}
                    </TableCell>
                    <TableCell className='max-w-32 truncate text-muted-foreground text-sm'>
                      {channel.createdBy.name}
                    </TableCell>
                    <TableCell className='whitespace-nowrap text-muted-foreground text-sm'>
                      {formatDistanceToNow(new Date(channel.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-7 text-muted-foreground hover:text-destructive'
                        onClick={() => setDeleteTarget(channel)}
                      >
                        <IconTrash className='size-4' />
                      </Button>
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete channel</DialogTitle>
          </DialogHeader>
          <p className='text-muted-foreground text-sm'>
            Permanently delete{' '}
            <strong className='text-foreground'>{deleteTarget?.name ?? 'this direct message'}</strong>? All messages and
            members will be removed. This cannot be undone.
          </p>
          {deleteMutation.error && (
            <p className='text-destructive text-xs'>{(deleteMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
