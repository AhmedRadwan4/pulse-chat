'use client'

import { IconSettings } from '@tabler/icons-react'
import type { Table, VisibilityState } from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

type DataTableViewOptionsProps<TData> = {
  table: Table<TData>
  visibilityState: VisibilityState // <--- We accept the state here
}

export function DataTableViewOptions<TData>({ table, visibilityState }: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline' size='sm' />}>
        <IconSettings className='mr-2 h-4 w-4' />
        View
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-37.5'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
            .getAllColumns()
            .filter(column => typeof column.accessorFn !== 'undefined' && column.getCanHide())
            .map(column => {
              const isVisible = visibilityState[column.id] !== false

              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className='capitalize'
                  checked={isVisible} // <--- Using the prop determines the checkmark
                  onCheckedChange={value => {
                    column.toggleVisibility(!!value)
                  }}
                  onSelect={e => {
                    e.preventDefault()
                  }}
                >
                  {column.id.replace(/([a-z])([A-Z])/g, '$1 $2')}
                </DropdownMenuCheckboxItem>
              )
            })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
