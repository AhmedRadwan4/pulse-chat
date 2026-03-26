import { IconShieldOff } from '@tabler/icons-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function Forbidden() {
  return (
    <div className='flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6'>
      <div className='flex w-full max-w-sm flex-col items-center gap-4 text-center'>
        <div className='flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
          <IconShieldOff className='size-6' />
        </div>
        <div className='flex flex-col gap-1'>
          <h1 className='font-semibold text-xl'>Access Denied</h1>
          <p className='text-muted-foreground text-sm'>You don&apos;t have permission to access this page.</p>
        </div>
        <Button variant='outline' asChild>
          <Link href='/chat'>Go to Chat</Link>
        </Button>
      </div>
    </div>
  )
}
