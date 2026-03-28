'use client'

import { IconHash, IconSearch } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/axios'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/db'

type SearchMessage = Omit<Message, 'attachments' | 'reactions'> & {
  channel: { id: string; name: string | null; type: string }
}

interface SearchPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId?: string
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className='rounded-sm bg-yellow-200 px-0.5 dark:bg-yellow-800'>
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function SearchPanel({ open, onOpenChange, channelId }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [scope, setScope] = useState<'channel' | 'global'>(channelId ? 'channel' : 'global')
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebouncedQuery('')
    }
  }, [open])

  const {
    data: results,
    isLoading,
    isFetching
  } = useQuery({
    queryKey: ['search', debouncedQuery, scope === 'channel' ? channelId : null],
    queryFn: async () => {
      const params = new URLSearchParams({ q: debouncedQuery })
      if (scope === 'channel' && channelId) params.set('channelId', channelId)
      const res = await api.get<{ messages: SearchMessage[] }>(`/api/search?${params}`)
      return res.data.messages
    },
    enabled: debouncedQuery.length >= 2
  })

  function handleSelect(msg: SearchMessage) {
    onOpenChange(false)
    const path = msg.channel.type === 'DIRECT' ? `/chat/dm/${msg.channelId}` : `/chat/${msg.channelId}`
    router.push(path)
  }

  const showResults = debouncedQuery.length >= 2
  const loading = showResults && (isLoading || (isFetching && !results))
  const empty = showResults && !loading && (!results || results.length === 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className='overflow-hidden p-0 sm:max-w-2xl'>
        {/* Input */}
        <div className='flex items-center gap-3 border-b px-4 py-3'>
          <IconSearch className='size-4 shrink-0 text-muted-foreground' />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Search messages…'
            className='min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground'
          />
          {channelId && (
            <div className='flex shrink-0 overflow-hidden rounded-md border text-xs'>
              <button
                type='button'
                onClick={() => setScope('channel')}
                className={cn(
                  'px-2.5 py-1 transition-colors',
                  scope === 'channel' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                This channel
              </button>
              <button
                type='button'
                onClick={() => setScope('global')}
                className={cn(
                  'px-2.5 py-1 transition-colors',
                  scope === 'global' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                All channels
              </button>
            </div>
          )}
        </div>

        <ScrollArea className='max-h-[28rem]'>
          {/* Skeleton */}
          {loading && (
            <div className='space-y-1 p-2'>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className='flex gap-3 rounded-lg p-3'>
                  <Skeleton className='size-7 shrink-0 rounded-full' />
                  <div className='flex-1 space-y-2'>
                    <Skeleton className='h-3 w-28' />
                    <Skeleton className='h-3 w-full' />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Prompt */}
          {!showResults && (
            <p className='px-4 py-10 text-center text-muted-foreground text-sm'>Type at least 2 characters to search</p>
          )}

          {/* Empty */}
          {empty && (
            <p className='px-4 py-10 text-center text-muted-foreground text-sm'>
              No messages found for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {/* Results */}
          {results && results.length > 0 && (
            <div className='p-2'>
              {results.map(msg => (
                <button
                  key={msg.id}
                  type='button'
                  onClick={() => handleSelect(msg)}
                  className='flex w-full gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent'
                >
                  <Avatar size='sm' className='mt-0.5 shrink-0'>
                    <AvatarImage src={msg.sender.image ?? undefined} alt={msg.sender.name} />
                    <AvatarFallback>{getInitials(msg.sender.name)}</AvatarFallback>
                  </Avatar>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-baseline gap-1.5'>
                      <span className='font-medium text-sm'>{msg.sender.name}</span>
                      <span className='flex items-center gap-0.5 text-muted-foreground text-xs'>
                        {msg.channel.type === 'DIRECT' ? (
                          'Direct message'
                        ) : (
                          <>
                            <IconHash className='size-3' />
                            {msg.channel.name ?? 'unknown'}
                          </>
                        )}
                      </span>
                      <span className='ml-auto shrink-0 text-muted-foreground text-xs'>
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className='mt-0.5 line-clamp-2 text-muted-foreground text-xs'>
                      {msg.content ? highlight(msg.content, debouncedQuery) : <em>No text content</em>}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
