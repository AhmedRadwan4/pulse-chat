import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  apiAuthPrefix,
  authRoutes,
  chatRoutes,
  defaultLoginRedirect,
  publicApiPrefixes,
  publicRoutes
} from '@/routes'

type BetterAuthSession = {
  user: {
    id: string
    role: string | null
    banned: boolean | null
    banExpires: string | null
  }
} | null

async function fetchSession(request: NextRequest): Promise<BetterAuthSession> {
  try {
    const res = await fetch(`${request.nextUrl.origin}${apiAuthPrefix}/get-session`, {
      headers: { cookie: request.headers.get('cookie') ?? '' }
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const { nextUrl } = request
  const pathname = nextUrl.pathname

  // 1. Public API routes — always pass through
  if (pathname.startsWith(apiAuthPrefix) || publicApiPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // 2. Static assets and Next.js internals — excluded by matcher

  // 3. Fetch session
  const session = await fetchSession(request)
  const isLoggedIn = Boolean(session?.user?.id)

  // 4. Ban check
  if (session?.user?.banned && pathname !== '/auth/banned') {
    const banExpired = session.user.banExpires ? new Date(session.user.banExpires) < new Date() : false
    if (!banExpired) {
      return NextResponse.redirect(new URL('/auth/banned', nextUrl))
    }
  }

  // 5. Auth routes — redirect logged-in users away
  if (authRoutes.some(r => pathname.startsWith(r))) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(defaultLoginRedirect, nextUrl))
    }
    return NextResponse.next()
  }

  // 6. Public routes — always allow
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // 7. Chat routes — require auth
  const isChatRoute = pathname.startsWith(chatRoutes.chat)
  if (isChatRoute) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(pathname + nextUrl.search)
      return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, nextUrl))
    }
    const response = NextResponse.next({
      request: {
        headers: new Headers({
          ...Object.fromEntries(request.headers),
          'x-user-id': session!.user.id
        })
      }
    })
    return response
  }

  // 8. Any other protected route — require auth
  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname + nextUrl.search)
    return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf)).*)']
}
