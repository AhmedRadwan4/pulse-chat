import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.AWS_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
  },
  forcePathStyle: true // required for Cloudflare R2 and MinIO
})

const BUCKET = process.env.S3_BUCKET!
const PUBLIC_URL = process.env.S3_PUBLIC_URL!

const PRESIGN_EXPIRES_IN = 3600 // 1 hour

/**
 * Generate a presigned PUT URL for direct client-to-S3 upload.
 * Returns the upload URL (for PUT) and the public CDN URL the file will be served from.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<{ uploadUrl: string; cdnUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType
  })

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGN_EXPIRES_IN })
  const cdnUrl = `${PUBLIC_URL.replace(/\/$/, '')}/${key}`

  return { uploadUrl, cdnUrl }
}

/**
 * Build a CDN URL for an existing object key without signing.
 */
export function getCdnUrl(key: string): string {
  return `${PUBLIC_URL.replace(/\/$/, '')}/${key}`
}
