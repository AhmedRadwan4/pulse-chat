import { Suspense } from 'react'
import { SignInForm } from '@/components/auth/signIn-form'

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
