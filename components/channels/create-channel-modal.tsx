'use client'

import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/axios'
import { type ChannelCreateInput, ChannelCreateSchema } from '@/schemas'
import type { Channel } from '@/types/db'

interface CreateChannelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateChannelModal({ open, onOpenChange }: CreateChannelModalProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (values: ChannelCreateInput) => {
      const res = await api.post<Channel>('/api/channels', values)
      return res.data
    },
    onSuccess: channel => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      onOpenChange(false)
      router.push(`/chat/${channel.id}`)
    }
  })

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      type: 'PUBLIC' as 'PUBLIC' | 'PRIVATE'
    },
    onSubmit: async ({ value }) => {
      const parsed = ChannelCreateSchema.safeParse(value)
      if (!parsed.success) return
      await mutation.mutateAsync(parsed.data)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Channel</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={e => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className='space-y-4'
        >
          <form.Field
            name='name'
            validators={{
              onChange: ({ value }) => {
                const result = ChannelCreateSchema.shape.name.safeParse(value)
                return result.success ? undefined : (result.error.issues[0]?.message ?? 'Invalid value')
              }
            }}
          >
            {field => (
              <div className='space-y-1'>
                <Label htmlFor='channel-name'>Channel Name</Label>
                <Input
                  id='channel-name'
                  placeholder='e.g. general'
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  autoComplete='off'
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className='text-destructive text-xs'>{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name='description'>
            {field => (
              <div className='space-y-1'>
                <Label htmlFor='channel-description'>
                  Description <span className='text-muted-foreground'>(optional)</span>
                </Label>
                <Input
                  id='channel-description'
                  placeholder='What is this channel about?'
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>

          <form.Field name='type'>
            {field => (
              <div className='space-y-1'>
                <Label>Type</Label>
                <div className='flex gap-2'>
                  {(['PUBLIC', 'PRIVATE'] as const).map(t => (
                    <button
                      key={t}
                      type='button'
                      onClick={() => field.handleChange(t)}
                      className={[
                        'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors',
                        field.state.value === t
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-foreground/30'
                      ].join(' ')}
                    >
                      {t === 'PUBLIC' ? 'Public' : 'Private'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form.Field>

          {mutation.error && <p className='text-destructive text-xs'>{mutation.error.message}</p>}

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={mutation.isPending || form.state.isSubmitting}>
              {mutation.isPending ? 'Creating...' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
