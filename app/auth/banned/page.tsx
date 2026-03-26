import { IconShieldX } from '@tabler/icons-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function BannedPage() {
  return (
    <div className='flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6'>
      <div className='flex w-full max-w-sm flex-col items-center gap-4 text-center'>
        <div className='flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
          <IconShieldX className='size-6' />
        </div>
        <div className='flex flex-col gap-1'>
          <h1 className='font-semibold text-xl'>Account Suspended</h1>
          <p className='text-muted-foreground text-sm'>
            Your account has been suspended. If you believe this is a mistake, please contact support.
          </p>
        </div>
        <Button variant='outline' asChild>
          <Link href='/'>Go Home</Link>
        </Button>
      </div>
    </div>
  )
}
