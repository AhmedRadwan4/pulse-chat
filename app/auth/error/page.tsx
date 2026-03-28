import { IconAlertTriangle } from '@tabler/icons-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function AuthErrorPage() {
  return (
    <div className='flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6'>
      <div className='flex w-full max-w-sm flex-col items-center gap-4 text-center'>
        <div className='flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
          <IconAlertTriangle className='size-6' />
        </div>
        <div className='flex flex-col gap-1'>
          <h1 className='font-semibold text-xl'>Authentication Error</h1>
          <p className='text-muted-foreground text-sm'>Something went wrong during sign in. Please try again.</p>
        </div>
        <Button asChild>
          <Link href='/auth/signin'>Back to Sign In</Link>
        </Button>
      </div>
    </div>
  )
}
