import prisma from '@/lib/prisma-client'
import { auth } from '@/lib/auth'

async function seed() {
  console.log('Seeding PulseChat database...')

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@pulsechat.dev'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!'

  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } })

  if (!adminUser) {
    const result = await auth.api.signUpEmail({
      body: {
        name: 'Admin',
        email: adminEmail,
        password: adminPassword
      }
    })
    adminUser = await prisma.user.findUnique({ where: { email: adminEmail } })
    console.log(`Created admin user: ${adminEmail}`)
  } else {
    console.log(`Admin user already exists: ${adminEmail}`)
  }

  if (!adminUser) throw new Error('Failed to create admin user')

  // Set role = 'admin' via BA admin plugin field
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { role: 'admin', emailVerified: true }
  })

  // ── Default channels ────────────────────────────────────────────────────────
  const defaultChannels = [
    { name: 'general', description: 'General discussion for everyone' },
    { name: 'announcements', description: 'Important announcements from the team' },
    { name: 'random', description: 'Off-topic chat and fun stuff' }
  ]

  for (const ch of defaultChannels) {
    const existing = await prisma.channel.findFirst({ where: { name: ch.name } })
    if (!existing) {
      const channel = await prisma.channel.create({
        data: {
          name: ch.name,
          description: ch.description,
          type: 'PUBLIC',
          createdById: adminUser.id,
          members: {
            create: {
              userId: adminUser.id,
              role: 'OWNER'
            }
          }
        }
      })
      console.log(`Created channel: #${channel.name}`)
    } else {
      console.log(`Channel already exists: #${ch.name}`)
    }
  }

  console.log('Seeding complete.')
}

seed()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
