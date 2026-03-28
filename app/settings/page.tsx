'use client'

import { IconArrowLeft, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/axios'

interface MyProfile {
  id: string
  name: string
  username: string | null
  discoverable: boolean
}

export default function SettingsPage() {
  const queryClient = useQueryClient()

  const { data: profile, isPending } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<MyProfile>('/api/users/me')
      return res.data
    }
  })

  const mutation = useMutation({
    mutationFn: async (discoverable: boolean) => {
      const res = await api.patch<{ discoverable: boolean }>('/api/users/me', { discoverable })
      return res.data.discoverable
    },
    onSuccess: discoverable => {
      queryClient.setQueryData<MyProfile>(['me'], old => (old ? { ...old, discoverable } : old))
    }
  })

  return (
    <div className='min-h-screen bg-background'>
      <div className='mx-auto max-w-2xl px-4 py-8'>
        <div className='mb-6 flex items-center gap-3'>
          <Button variant='ghost' size='icon-sm' render={<Link href='/chat' />} nativeButton={false}>
            <IconArrowLeft className='size-4' />
          </Button>
          <h1 className='font-semibold text-xl'>Settings</h1>
        </div>

        <div className='divide-y divide-border rounded-lg border border-border'>
          {/* Privacy section */}
          <div className='px-5 py-4'>
            <h2 className='mb-4 font-semibold text-muted-foreground text-sm uppercase tracking-wider'>Privacy</h2>

            <div className='flex items-start justify-between gap-4'>
              <div className='space-y-1'>
                <div className='flex items-center gap-2'>
                  {isPending ? (
                    <div className='h-4 w-4 animate-pulse rounded bg-muted' />
                  ) : profile?.discoverable ? (
                    <IconEye className='size-4 text-emerald-600' />
                  ) : (
                    <IconEyeOff className='size-4 text-muted-foreground' />
                  )}
                  <p className='font-medium text-sm'>Discoverable in user search</p>
                </div>
                <p className='text-muted-foreground text-xs'>
                  {profile?.discoverable
                    ? 'Other users can find you in the DM user picker.'
                    : 'You are hidden from the DM user picker. Only users who already have a conversation with you can message you.'}
                </p>
              </div>

              <Button
                variant={profile?.discoverable ? 'outline' : 'default'}
                size='sm'
                disabled={isPending || mutation.isPending}
                onClick={() => profile && mutation.mutate(!profile.discoverable)}
                className='shrink-0'
              >
                {mutation.isPending ? 'Saving…' : profile?.discoverable ? 'Hide me' : 'Make discoverable'}
              </Button>
            </div>

            {mutation.error && <p className='mt-2 text-destructive text-xs'>{(mutation.error as Error).message}</p>}
          </div>

          {/* Placeholder for future settings sections */}
          <div className='px-5 py-4'>
            <h2 className='mb-2 font-semibold text-muted-foreground text-sm uppercase tracking-wider'>Account</h2>
            <p className='text-muted-foreground text-xs'>More account settings coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
