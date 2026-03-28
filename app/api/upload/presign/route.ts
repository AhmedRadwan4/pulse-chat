import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/session'

const PresignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  size: z
    .number()
    .int()
    .positive()
    .max(100 * 1024 * 1024) // 100 MB max
})

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]

function getS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
    }
  })
}

export async function POST(request: NextRequest) {
  await requireAuth()

  const body = await request.json()
  const parsed = PresignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { filename, contentType, size: _size } = parsed.data

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  const ext = filename.split('.').pop() ?? ''
  const key = `pulse-chat/uploads/${randomUUID()}${ext ? '.' + ext : ''}`
  const bucket = process.env.R2_BUCKET_NAME!

  const s3 = getS3Client()
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  })

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
  const cdnUrl = `${process.env.NEXT_PUBLIC_R2_DOMAIN}/${key}`

  return NextResponse.json({ uploadUrl, cdnUrl })
}
