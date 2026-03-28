import {
  IconBolt,
  IconHash,
  IconMoodHappy,
  IconPaperclip,
  IconSearch,
  IconShield,
  IconUsers
} from '@tabler/icons-react'
import Link from 'next/link'

// ─── Reusable pieces ─────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className='flex items-center gap-2'>
      <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-primary'>
        <span className='font-bold text-primary-foreground text-sm'>P</span>
      </div>
      <span className='font-bold text-lg tracking-tight'>PulseChat</span>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className='rounded-xl border bg-card p-6 transition-shadow hover:shadow-md'>
      <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10'>
        <Icon className='size-5 text-primary' />
      </div>
      <h3 className='mb-1 font-semibold text-base'>{title}</h3>
      <p className='text-muted-foreground text-sm leading-relaxed'>{description}</p>
    </div>
  )
}

// ─── Mock chat UI for the hero ────────────────────────────────────────────────

const MOCK_MESSAGES = [
  { id: 1, name: 'Alex', color: 'bg-violet-500', text: 'Hey team, the new design looks great!', time: '9:41 AM' },
  { id: 2, name: 'Sam', color: 'bg-sky-500', text: 'Agreed — shipping it today 🚀', time: '9:42 AM' },
  { id: 3, name: 'Jordan', color: 'bg-emerald-500', text: '@Alex can you share the Figma link?', time: '9:43 AM' },
  { id: 4, name: 'Alex', color: 'bg-violet-500', text: 'Sure! Just dropped it in #design', time: '9:43 AM' }
]

function HeroMockup() {
  return (
    <div className='w-full overflow-hidden rounded-2xl border bg-card shadow-2xl ring-1 ring-foreground/5'>
      <div className='flex h-[340px] md:h-[420px]'>
        {/* Sidebar */}
        <div className='hidden w-52 shrink-0 flex-col border-r bg-muted/40 p-3 md:flex'>
          <div className='mb-3 flex items-center gap-2 px-1'>
            <div className='h-5 w-5 rounded-md bg-primary' />
            <div className='h-2.5 w-16 rounded-full bg-foreground/20' />
          </div>
          <p className='mb-1 px-2 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider'>Channels</p>
          {['general', 'design', 'engineering', 'random'].map((name, i) => (
            <div
              key={name}
              className={`mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 ${i === 0 ? 'bg-accent' : ''}`}
            >
              <div className='h-3 w-3 shrink-0 rounded-sm bg-muted-foreground/30' />
              <div className='h-2 rounded-full bg-foreground/20' style={{ width: `${36 + i * 12}px` }} />
            </div>
          ))}
          <p className='mt-3 mb-1 px-2 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider'>
            Direct messages
          </p>
          {['Sam', 'Jordan'].map((name, i) => (
            <div key={name} className='mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5'>
              <div className={`h-4 w-4 shrink-0 rounded-full ${i === 0 ? 'bg-sky-400' : 'bg-emerald-400'}`} />
              <div className='h-2 w-10 rounded-full bg-foreground/20' />
              <div className='ml-auto h-2 w-2 rounded-full bg-green-500' />
            </div>
          ))}
        </div>

        {/* Main area */}
        <div className='flex flex-1 flex-col overflow-hidden'>
          {/* Header */}
          <div className='flex h-11 shrink-0 items-center gap-2 border-b px-4'>
            <div className='h-3.5 w-3.5 rounded bg-muted-foreground/30' />
            <div className='h-2.5 w-16 rounded-full bg-foreground/25' />
            <div className='ml-auto flex gap-1.5'>
              <div className='h-6 w-6 rounded-md bg-muted' />
              <div className='h-6 w-6 rounded-md bg-muted' />
            </div>
          </div>

          {/* Messages */}
          <div className='flex-1 space-y-3 overflow-hidden p-4'>
            {MOCK_MESSAGES.map(msg => (
              <div key={msg.id} className='flex gap-2.5'>
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-white text-xs ${msg.color}`}
                >
                  {msg.name[0]}
                </div>
                <div>
                  <div className='flex items-baseline gap-2'>
                    <span className='font-semibold text-xs'>{msg.name}</span>
                    <span className='text-[10px] text-muted-foreground'>{msg.time}</span>
                  </div>
                  <p className='mt-0.5 text-xs leading-relaxed'>{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className='shrink-0 border-t p-3'>
            <div className='flex items-center gap-2 rounded-lg border bg-background px-3 py-2'>
              <div className='h-2.5 w-40 rounded-full bg-muted-foreground/20' />
              <div className='ml-auto flex gap-1.5'>
                <div className='h-5 w-5 rounded bg-muted' />
                <div className='h-5 w-5 rounded bg-primary/80' />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page sections ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className='flex min-h-screen flex-col'>
      {/* Nav */}
      <nav className='sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm'>
        <div className='mx-auto flex h-14 max-w-6xl items-center justify-between px-4'>
          <Logo />
          <div className='flex items-center gap-2'>
            <Link
              href='/auth/signin'
              className='rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground'
            >
              Sign in
            </Link>
            <Link
              href='/auth/signup'
              className='rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90'
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className='relative flex flex-col items-center px-4 pt-24 pb-20 text-center'>
        <span className='mb-6 inline-flex items-center gap-1.5 rounded-full border bg-primary/5 px-3 py-1 font-medium text-primary text-xs'>
          <IconBolt className='size-3.5' />
          Now in public beta
        </span>

        <h1 className='mx-auto max-w-3xl text-balance font-bold text-4xl leading-tight tracking-tight md:text-6xl'>
          The team chat that moves at the{' '}
          <span className='bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent'>
            speed of thought
          </span>
        </h1>

        <p className='mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground leading-relaxed'>
          Real-time messaging, threads, search, and more — for teams who want clarity without the noise.
        </p>

        <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
          <Link
            href='/auth/signup'
            className='rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90'
          >
            Start for free →
          </Link>
          <Link
            href='/auth/signin'
            className='rounded-lg border px-6 py-2.5 font-medium text-sm transition-colors hover:bg-muted'
          >
            Sign in
          </Link>
        </div>

        <div className='mt-16 w-full max-w-4xl'>
          <HeroMockup />
        </div>
      </section>

      {/* Stats */}
      <section className='border-y bg-muted/30 py-12'>
        <div className='mx-auto flex max-w-3xl flex-wrap justify-center gap-12 px-4'>
          {[
            { value: '< 50ms', label: 'Message delivery' },
            { value: 'Real-time', label: 'Presence & typing' },
            { value: '100%', label: 'Open source' }
          ].map(stat => (
            <div key={stat.label} className='text-center'>
              <p className='font-bold text-2xl'>{stat.value}</p>
              <p className='mt-1 text-muted-foreground text-sm'>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className='py-24'>
        <div className='mx-auto max-w-6xl px-4'>
          <div className='text-center'>
            <h2 className='font-bold text-3xl tracking-tight'>Everything your team needs</h2>
            <p className='mt-2 text-muted-foreground'>No plugins. No complexity. Just the features that matter.</p>
          </div>

          <div className='mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
            <FeatureCard
              icon={IconBolt}
              title='Real-time messaging'
              description='Send messages that arrive instantly — no refresh, no delay. Powered by Socket.IO for sub-50ms delivery.'
            />
            <FeatureCard
              icon={IconHash}
              title='Threads'
              description='Keep side-conversations organized without cluttering the main channel. Every message can spawn a thread.'
            />
            <FeatureCard
              icon={IconPaperclip}
              title='File uploads'
              description='Share images, documents, and files with drag-and-drop simplicity. Files go straight to cloud storage.'
            />
            <FeatureCard
              icon={IconSearch}
              title='Powerful search'
              description='Find any message across all your channels in seconds using full-text PostgreSQL search with relevance ranking.'
            />
            <FeatureCard
              icon={IconMoodHappy}
              title='Emoji reactions'
              description='Express yourself without typing a word. Add quick emoji reactions to any message in one click.'
            />
            <FeatureCard
              icon={IconUsers}
              title='Presence indicators'
              description='Always know who is online and available right now. Typing indicators show when someone is composing.'
            />
          </div>
        </div>
      </section>

      {/* Security note */}
      <section className='border-t py-12'>
        <div className='mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 text-center'>
          <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10'>
            <IconShield className='size-5 text-primary' />
          </div>
          <h3 className='font-semibold text-lg'>Built with security in mind</h3>
          <p className='max-w-md text-muted-foreground text-sm leading-relaxed'>
            End-to-end encryption available per channel. Private channels, role-based access control, and audit-ready
            message history.
          </p>
        </div>
      </section>

      {/* CTA banner */}
      <section className='bg-primary py-20 text-primary-foreground'>
        <div className='mx-auto max-w-2xl px-4 text-center'>
          <h2 className='font-bold text-3xl tracking-tight'>Ready to give your team a better way to communicate?</h2>
          <p className='mt-3 text-primary-foreground/75'>Get started in seconds — no credit card required.</p>
          <div className='mt-8 flex flex-wrap justify-center gap-3'>
            <Link
              href='/auth/signup'
              className='rounded-lg bg-primary-foreground px-6 py-2.5 font-medium text-primary text-sm transition-opacity hover:opacity-90'
            >
              Get started for free
            </Link>
            <Link
              href='/auth/signin'
              className='rounded-lg border border-primary-foreground/30 px-6 py-2.5 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary-foreground/10'
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t py-8'>
        <div className='mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row'>
          <div className='flex items-center gap-3'>
            <Logo />
            <span className='text-muted-foreground text-sm'>© 2026</span>
          </div>
          <div className='flex items-center gap-5 text-muted-foreground text-sm'>
            <Link href='/auth/signin' className='transition-colors hover:text-foreground'>
              Sign in
            </Link>
            <Link href='/auth/signup' className='transition-colors hover:text-foreground'>
              Sign up
            </Link>
            <Link href='/chat' className='transition-colors hover:text-foreground'>
              Open app
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
