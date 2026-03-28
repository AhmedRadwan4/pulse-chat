'use client'

import { IconUpload } from '@tabler/icons-react'
import { useDropzone } from 'react-dropzone'

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt']
}

interface FileDropzoneProps {
  onFiles: (files: File[]) => void
  children: React.ReactNode
}

export function FileDropzone({ onFiles, children }: FileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
    accept: ACCEPTED_TYPES,
    maxSize: 100 * 1024 * 1024,
    noClick: true,
    noKeyboard: true
  })

  return (
    <div {...getRootProps()} className='relative'>
      <input {...getInputProps()} />
      {isDragActive && (
        <div className='absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-primary border-dashed bg-primary/5'>
          <div className='flex flex-col items-center gap-2 text-primary'>
            <IconUpload className='size-8' />
            <p className='font-medium text-sm'>Drop files to attach</p>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
