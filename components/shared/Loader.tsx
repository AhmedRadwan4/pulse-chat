'use client'
import { AnimatePresence, motion } from 'framer-motion'
import * as React from 'react'
import { Spinner } from '@/components/ui/spinner'

type LoadingTextProps = {
  text: string
  dots: string
}

export function LoadingText({ text, dots }: LoadingTextProps) {
  return (
    <div className='relative'>
      <AnimatePresence mode='wait'>
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className='w-full font-medium text-lg'
        >
          {text}
          {dots}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
type LoadingProps = {
  messages: string[]
  interval?: number
  dotCount?: number
  direction?: 'horizontal' | 'vertical'
}

export function Loader({ messages, interval = 2000, dotCount = 3, direction = 'vertical' }: LoadingProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [dots, setDots] = React.useState('')

  React.useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % messages.length)
    }, interval)

    const dotInterval = setInterval(() => {
      setDots(prev => (prev.length >= dotCount ? '' : `${prev}.`))
    }, 500)

    return () => {
      clearInterval(messageInterval)
      clearInterval(dotInterval)
    }
  }, [messages.length, interval, dotCount])

  if (direction === 'horizontal') {
    return (
      <div className='flex w-full items-center justify-start gap-3 rounded-sm border px-3 py-2'>
        <motion.div
          className='size-5 rounded-full border-[3px] border-t-transparent text-primary-foreground md:size-6'
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear'
          }}
        />
        <LoadingText text={messages[currentIndex] ?? ''} dots={dots} />
      </div>
    )
  }

  return (
    <div className='flex flex-col items-center justify-center gap-4 py-1'>
      <Spinner />
      <LoadingText text={messages[currentIndex] ?? ''} dots={dots} />
    </div>
  )
}
