'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useIsMobile } from '@/hooks/use-mobile'

// Set the maximum number of breadcrumbs to show without collapsing
const ITEMS_TO_DISPLAY = 3

// Define segments to be excluded from the breadcrumbs
const SEGMENTS_TO_EXCLUDE = ['admin']

export function BreadcrumbResponsive() {
  const pathname = usePathname()
  const isDesktop = !useIsMobile()

  const pathItems = React.useMemo(() => {
    const items: { href: string; label: string }[] = []

    // 1. Get all actual path segments from the URL
    const pathSegments = pathname.split('/').filter(Boolean)

    // 2. Add the base 'Overview' item
    // Add it if the first segment isn't 'overview' or if the path is empty.
    if (!pathSegments[0] || pathSegments[0].toLowerCase() !== 'overview') {
      items.push({ href: '/overview', label: 'Overview' })
    }

    // 3. Iterate through all segments to build the full path and the breadcrumb items
    let currentPathAccumulator = ''
    pathSegments.forEach(segment => {
      // Accumulate the full path (including 'admin') for the link's href
      currentPathAccumulator += `/${segment}`

      // Check if the segment should be excluded from the breadcrumb display
      if (!SEGMENTS_TO_EXCLUDE.includes(segment.toLowerCase())) {
        // Special handling to prevent 'overview' from being added twice
        // if the route is /overview/... and we already added the base 'Overview'
        if (segment.toLowerCase() === 'overview' && items.length > 0 && items[0]?.label === 'Overview') {
          // If we already have the base 'Overview' item, and this segment is also 'overview', skip it.
          // This keeps the base item as the starting point.
          return
        }

        const label = segment.charAt(0).toUpperCase() + segment.slice(1)

        items.push({
          href: currentPathAccumulator, // Full path for navigation
          label
        })
      }
    })

    return items
  }, [pathname])

  const itemCount = pathItems.length

  // Render all items if their count is less than or equal to the threshold.
  if (itemCount <= ITEMS_TO_DISPLAY) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          {pathItems.map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {index < itemCount - 1 ? (
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className='max-w-20 truncate md:max-w-none'>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < itemCount - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  // Otherwise, collapse the intermediate items into a dropdown or drawer.
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* First item */}
        <BreadcrumbItem>
          <BreadcrumbLink href={pathItems[0]?.href}>{pathItems[0]?.label}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {/* Collapsed intermediate items */}
        <BreadcrumbItem>
          {isDesktop ? (
            <DropdownMenu>
              <DropdownMenuTrigger className='flex items-center gap-1' aria-label='Toggle menu'>
                <BreadcrumbEllipsis className='h-4 w-4' />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start'>
                {pathItems.slice(1, -1).map((item, index) => (
                  <DropdownMenuItem key={index}>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Drawer>
              <DrawerTrigger aria-label='Toggle Menu'>
                <BreadcrumbEllipsis className='h-4 w-4' />
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader className='text-left'>
                  <DrawerTitle>Navigate to</DrawerTitle>
                  <DrawerDescription>Select a page to navigate to.</DrawerDescription>
                </DrawerHeader>
                <div className='grid gap-1 px-4'>
                  {pathItems.slice(1, -1).map((item, index) => (
                    <Link key={index} href={item.href} className='py-1 text-sm'>
                      {item.label}
                    </Link>
                  ))}
                </div>
                <DrawerFooter className='pt-4'>
                  <DrawerClose asChild>
                    <Button variant='outline'>Close</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          )}
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {/* Last item */}
        <BreadcrumbItem>
          <BreadcrumbPage className='max-w-20 truncate md:max-w-none'>{pathItems[itemCount - 1]?.label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
