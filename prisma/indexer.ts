import prisma from '@/lib/prisma-client'

async function clearTables() {
  try {
    console.log('Clearing existing data...')

    console.log('Deleting role permissions...')
    await prisma.rolePermission.deleteMany({})
    console.log('✅ Role permissions deleted')

    console.log('Deleting invoices...')
    await prisma.invoice.deleteMany({})
    console.log('✅ Invoices deleted')

    console.log('Deleting permissions...')
    await prisma.permission.deleteMany({})
    console.log('✅ Permissions deleted')

    console.log('Deleting OTPs...')
    await prisma.otp.deleteMany({})
    console.log('✅ OTPs deleted')

    console.log('Deleting users...')
    await prisma.user.deleteMany({})
    console.log('✅ Users deleted')

    console.log('Deleting roles...')
    await prisma.role.deleteMany({})
    console.log('✅ Roles deleted')

    console.log('Deleting accounts...')
    await prisma.account.deleteMany({})
    console.log('✅ Accounts deleted')

    console.log('Deleting sessions...')
    await prisma.session.deleteMany({})
    console.log('✅ Sessions deleted')

    console.log('Deleting verification tokens...')
    await prisma.verification.deleteMany({})
    console.log('✅ Verification tokens deleted')

    console.log('✅ Tables cleared successfully')
  } catch (error) {
    console.error('❌ Error clearing tables:', error)
    throw error
  }
}

async function main() {
  await clearTables()
}

main()
  .then(() => {
    console.log('✨ All tables cleared')
  })
  .catch((e: unknown) => {
    console.error('❌ Unexpected error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
