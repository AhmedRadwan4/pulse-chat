'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/axios'

interface User {
  id: string
  name: string
  username: string | null
  image: string | null
}

interface NewDmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewDmModal({ open, onOpenChange }: NewDmModalProps) {
  const [search, setSearch] = useState('')
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get<{ users: User[] }>('/api/users')
      return res.data.users
    },
    enabled: open
  })

  const mutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post<{ channelId: string }>('/api/direct-messages', { userId })
      return res.data.channelId
    },
    onSuccess: (channelId, userId) => {
      // Optimistically add the DM to the sidebar list so it appears highlighted immediately on navigation
      const selectedUser = data?.find(u => u.id === userId) ?? null
      queryClient.setQueryData<{ channelId: string; otherUser: User | null }[]>(['dms'], old => {
        if (!old) return [{ channelId, otherUser: selectedUser }]
        if (old.some(dm => dm.channelId === channelId)) return old
        return [...old, { channelId, otherUser: selectedUser }]
      })
      queryClient.invalidateQueries({ queryKey: ['dms'] })
      onOpenChange(false)
      setSearch('')
      router.push(`/chat/dm/${channelId}`)
    }
  })

  const users = data ?? []
  const filtered = search.trim()
    ? users.filter(
        u =>
          (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (u.username ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : users

  function getInitials(name: string) {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        onOpenChange(v)
        if (!v) setSearch('')
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
        </DialogHeader>

        <Input
          placeholder='Search users...'
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete='off'
          autoFocus
        />

        <div className='mt-1 max-h-72 space-y-0.5 overflow-y-auto'>
          {filtered.length === 0 && <p className='py-6 text-center text-muted-foreground text-sm'>No users found</p>}
          {filtered.map(u => (
            <button
              key={u.id}
              type='button'
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(u.id)}
              className='flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-60'
            >
              <Avatar size='sm'>
                <AvatarImage src={u.image ?? undefined} alt={u.name} />
                <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
              </Avatar>
              <div className='min-w-0'>
                <p className='truncate font-medium'>{u.name}</p>
                {u.username && <p className='truncate text-muted-foreground text-xs'>@{u.username}</p>}
              </div>
            </button>
          ))}
        </div>

        {mutation.error && <p className='text-destructive text-xs'>{mutation.error.message}</p>}
      </DialogContent>
    </Dialog>
  )
}
