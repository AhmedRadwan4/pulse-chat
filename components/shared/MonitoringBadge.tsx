'use client'

import { IconLock, IconShield } from '@tabler/icons-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface MonitoringBadgeProps {
  mode: 'MONITORED' | 'E2E_ENCRYPTED'
}

export function MonitoringBadge({ mode }: MonitoringBadgeProps) {
  const isMonitored = mode === 'MONITORED'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <div
              className={[
                'pointer-events-auto flex select-none items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-xs',
                isMonitored
                  ? 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400'
              ].join(' ')}
            >
              {isMonitored ? <IconShield className='size-3 shrink-0' /> : <IconLock className='size-3 shrink-0' />}
              <span>{isMonitored ? 'Monitored' : 'End-to-end encrypted'}</span>
            </div>
          }
        />
        <TooltipContent side='bottom'>
          {isMonitored
            ? 'Messages in this channel may be reviewed by admins.'
            : 'Messages are end-to-end encrypted. Admins cannot read them.'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
