import * as React from 'react'

/**
 * Detects whether the soft keyboard is open on mobile devices
 * by watching for a significant reduction in the visual viewport height.
 */
export function useDetectKeyboardOpen(threshold = 0.75): boolean {
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const handler = () => {
      setIsOpen(vv.height < window.innerHeight * threshold)
    }

    vv.addEventListener('resize', handler)
    return () => vv.removeEventListener('resize', handler)
  }, [threshold])

  return isOpen
}
