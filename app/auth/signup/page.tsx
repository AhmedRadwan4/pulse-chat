import { Suspense } from 'react'
import { SignUpForm } from '@/components/auth/signUp-form'

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  )
}
