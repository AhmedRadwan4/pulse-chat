export const publicRoutes = ['/']
export const authRoutes = ['/auth/signin', '/auth/signup', '/auth/error', '/auth/banned']
export const apiAuthPrefix = '/api/auth'

export const publicApiPrefixes = ['/api/webhooks']

// Chat app routes
export const chatRoutes = {
  chat: '/chat'
} as const

// Redirect after login
export const defaultLoginRedirect = '/chat'
