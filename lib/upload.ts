import api from '@/lib/axios'

export type AttachmentType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO'

function getAttachmentType(contentType: string): AttachmentType {
  if (contentType.startsWith('image/')) return 'IMAGE'
  if (contentType.startsWith('video/')) return 'VIDEO'
  if (contentType.startsWith('audio/')) return 'AUDIO'
  return 'DOCUMENT'
}

export interface UploadResult {
  url: string
  type: AttachmentType
  name: string
  size: number
}

export async function uploadFile(file: File): Promise<UploadResult> {
  // 1. Get presigned URL from API
  const { data } = await api.post<{ uploadUrl: string; cdnUrl: string }>('/api/upload/presign', {
    filename: file.name,
    contentType: file.type,
    size: file.size
  })

  // 2. Upload directly to S3/R2
  await fetch(data.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  })

  return {
    url: data.cdnUrl,
    type: getAttachmentType(file.type),
    name: file.name,
    size: file.size
  }
}
