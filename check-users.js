const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkUsers() {
  console.log('Checking existing users...\n')
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      password: true
    }
  })

  if (users.length === 0) {
    console.log('❌ No users found in database!')
    console.log('\nCreating default admin user...')
    
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@hamdard.edu',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        status: 'APPROVED'
      }
    })
    
    console.log('✅ Admin user created!')
    console.log('   Email: admin@hamdard.edu')
    console.log('   Password: admin123')
    console.log('   Role: ADMIN\n')
  } else {
    console.log(`Found ${users.length} users:\n`)
    
    for (const user of users) {
      console.log(`📧 ${user.email}`)
      console.log(`   Name: ${user.name}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Status: ${user.status}`)
      console.log(`   Password Hash: ${user.password.substring(0, 20)}...`)
      
      // Test password
      const testPassword = 'admin123'
      const isValid = await bcrypt.compare(testPassword, user.password)
      console.log(`   Test Password (admin123): ${isValid ? '✅ Valid' : '❌ Invalid'}`)
      console.log('')
    }
  }

  // Check if approved admin exists
  const approvedAdmin = users.find(u => u.role === 'ADMIN' && u.status === 'APPROVED')
  if (!approvedAdmin) {
    console.log('⚠️  WARNING: No approved admin user found!')
    console.log('   Run "node create-demo-users.js" to create demo users\n')
  }
}

checkUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
