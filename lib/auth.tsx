import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import prisma from '@/lib/prisma-client'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
if (!GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID is missing')
}

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
if (!GOOGLE_CLIENT_SECRET) {
  throw new Error('GOOGLE_CLIENT_SECRET is missing')
}

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
if (!GITHUB_CLIENT_ID) {
  throw new Error('GITHUB_CLIENT_ID is missing')
}

const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
if (!GITHUB_CLIENT_SECRET) {
  throw new Error('GITHUB_CLIENT_SECRET is missing')
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true
  },
  socialProviders: {
    google: {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET
    },
    github: {
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET
    }
  },
  plugins: [admin()],
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map(s => s.trim())
    : [],
  advanced: {
    database: {
      generateId: false
    }
  }
})
