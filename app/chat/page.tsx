import { IconHash } from '@tabler/icons-react'

export default function ChatPage() {
  return (
    <div className='flex h-full flex-col items-center justify-center gap-3 text-center'>
      <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-muted'>
        <IconHash className='h-8 w-8 text-muted-foreground' />
      </div>
      <div className='space-y-1'>
        <h2 className='font-semibold text-lg'>No channel selected</h2>
        <p className='text-muted-foreground text-sm'>Select a channel from the sidebar to start chatting.</p>
      </div>
    </div>
  )
}
