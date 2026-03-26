'use client'

import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    if (!authClient) return // Guard clause

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push('/') // redirect to login page
          }
        }
      })
    } catch (error) {
      console.error('Sign-out failed:', error)
      // Optionally handle sign-out errors
    }
  }

  return (
    <button onClick={handleSignOut} type='button'>
      Sign Out
    </button>
  )
}
