import { IconArrowDown, IconArrowsUpDown, IconArrowUp } from '@tabler/icons-react'
import type { Column } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>
  title: string
} & React.HTMLAttributes<HTMLDivElement>

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => {
          column.toggleSorting(column.getIsSorted() === 'asc')
        }}
      >
        <span>{title}</span>
        {column.getIsSorted() === 'desc' ? (
          <IconArrowDown />
        ) : column.getIsSorted() === 'asc' ? (
          <IconArrowUp />
        ) : (
          <IconArrowsUpDown />
        )}
      </Button>
    </div>
  )
}
