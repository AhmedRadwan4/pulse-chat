'use client'

import { IconFileText, IconMusic, IconVideo, IconX } from '@tabler/icons-react'
import type { UploadResult } from '@/lib/upload'

interface UploadingFile {
  id: number
  name: string
}

interface AttachmentPreviewProps {
  uploading: UploadingFile[]
  attachments: UploadResult[]
  onRemove: (index: number) => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function TypeIcon({ type }: { type: UploadResult['type'] }) {
  if (type === 'VIDEO') return <IconVideo className='size-4 text-purple-500' />
  if (type === 'AUDIO') return <IconMusic className='size-4 text-green-500' />
  return <IconFileText className='size-4 text-muted-foreground' />
}

export function AttachmentPreview({ uploading, attachments, onRemove }: AttachmentPreviewProps) {
  if (uploading.length === 0 && attachments.length === 0) return null

  return (
    <div className='flex flex-wrap gap-2 px-3 pt-2'>
      {uploading.map(file => (
        <div
          key={file.id}
          className='flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm opacity-60'
        >
          <span className='size-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent' />
          <span className='max-w-32 truncate text-muted-foreground text-xs'>{file.name}</span>
        </div>
      ))}

      {attachments.map((attachment, i) => (
        <div
          key={`${attachment.url}-${i}`}
          className='flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm'
        >
          {attachment.type === 'IMAGE' ? (
            <img src={attachment.url} alt={attachment.name} className='size-8 rounded object-cover' />
          ) : (
            <TypeIcon type={attachment.type} />
          )}
          <div className='min-w-0'>
            <p className='max-w-32 truncate font-medium text-xs'>{attachment.name}</p>
            <p className='text-muted-foreground text-xs'>{formatBytes(attachment.size)}</p>
          </div>
          <button
            type='button'
            onClick={() => onRemove(i)}
            className='ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
            aria-label={`Remove ${attachment.name}`}
          >
            <IconX className='size-3' />
          </button>
        </div>
      ))}
    </div>
  )
}
