import { Suspense } from 'react'
import { ChatShell } from '@/components/chat/chat-shell'
import { requireAuth } from '@/lib/session'

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()
  return <ChatShell user={user}>{children}</ChatShell>
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  )
}
