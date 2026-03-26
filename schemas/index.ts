import { z } from 'zod'

export const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export const SignUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export const ChannelCreateSchema = z.object({
  name: z.string().min(1, 'Channel name is required').max(80, 'Channel name must be 80 characters or less'),
  description: z.string().max(250, 'Description must be 250 characters or less').optional(),
  type: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC')
})

export const MessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message must be 4000 characters or less'),
  channelId: z.string().uuid('Invalid channel ID'),
  threadId: z.string().uuid('Invalid thread ID').optional()
})

export type SignInInput = z.infer<typeof SignInSchema>
export type SignUpInput = z.infer<typeof SignUpSchema>
export type ChannelCreateInput = z.infer<typeof ChannelCreateSchema>
export type MessageInput = z.infer<typeof MessageSchema>
