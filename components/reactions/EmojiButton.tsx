'use client'

interface EmojiButtonProps {
  emoji: string
  count: number
  isActive: boolean
  onClick: () => void
}

export function EmojiButton({ emoji, count, isActive, onClick }: EmojiButtonProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      data-active={isActive}
      className='flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all hover:bg-muted active:scale-95 data-[active=false]:border-border data-[active=true]:border-primary/50 data-[active=false]:bg-muted/50 data-[active=true]:bg-primary/10'
    >
      <span>{emoji}</span>
      <span className='text-muted-foreground'>{count}</span>
    </button>
  )
}
