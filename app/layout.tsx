import type { Metadata } from 'next'
import { Nunito_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers'
import { cn } from '@/lib/utils'
import './globals.css'

const nunitoSans = Nunito_Sans({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'PulseChat',
  description: 'Real-time messaging for teams'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang='en'
      className={cn('h-full max-w-dvw', 'antialiased', 'font-sans', nunitoSans.variable)}
      suppressHydrationWarning
    >
      <body className='flex min-h-full flex-col'>
        <Providers>
          {children}
          <Toaster richColors position='top-right' />
        </Providers>
      </body>
    </html>
  )
}
