import { IconLock } from '@tabler/icons-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function Unauthorized() {
  return (
    <div className='flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6'>
      <div className='flex w-full max-w-sm flex-col items-center gap-4 text-center'>
        <div className='flex size-12 items-center justify-center rounded-full bg-muted-foreground/10 text-muted-foreground'>
          <IconLock className='size-6' />
        </div>
        <div className='flex flex-col gap-1'>
          <h1 className='font-semibold text-xl'>Sign In Required</h1>
          <p className='text-muted-foreground text-sm'>You must be signed in to access this page.</p>
        </div>
        <Button asChild>
          <Link href='/auth/signin'>Sign In</Link>
        </Button>
      </div>
    </div>
  )
}
