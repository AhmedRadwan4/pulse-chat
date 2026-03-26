'use client'

import { IconChevronUp } from '@tabler/icons-react'
import { motion } from 'framer-motion'
import * as React from 'react'

const BackToTopButton = () => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [scrollProgress, setScrollProgress] = React.useState(0)

  const toggleVisibility = () => {
    const scrollTop = window.scrollY

    const docHeight = document.documentElement.scrollHeight - window.innerHeight

    const scrollPercentage = (scrollTop / docHeight) * 100

    setScrollProgress(scrollPercentage)

    if (scrollTop > 150) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  React.useEffect(() => {
    window.addEventListener('scroll', toggleVisibility)

    return () => {
      window.removeEventListener('scroll', toggleVisibility)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 50 }}
      transition={{ duration: 0.3 }}
      className='fixed right-6 bottom-20 z-40'
    >
      {!!isVisible && (
        <button
          onClick={scrollToTop}
          className='relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg hover:cursor-pointer hover:bg-gray-200 focus:outline-none'
          style={{ position: 'relative' }}
        >
          <IconChevronUp />
          <svg
            className='absolute inset-0'
            viewBox='0 0 42 42'
            width='48'
            height='48'
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              cx='21'
              cy='21'
              r='20'
              stroke='black'
              strokeWidth='2'
              fill='none'
              strokeDasharray='126'
              strokeDashoffset={(126 * (100 - scrollProgress)) / 100}
              style={{ transition: 'stroke-dashoffset 0.3s ease-in-out' }}
            />
          </svg>
        </button>
      )}
    </motion.div>
  )
}

export default BackToTopButton
