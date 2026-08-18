import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const railwayUrl = "postgresql://postgres:fdwMMPbnEQDMAmehyYUbFAatgSXmJzTV@altaria.proxy.rlwy.net:31459/railway";
const prisma = new PrismaClient({
  datasources: {
    db: { url: railwayUrl }
  }
});

async function checkUsers() {
  console.log('Querying users on Railway PostgreSQL...');
  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });

  console.log('Found users:', users.length);
  for (const u of users) {
    console.log('User:', u.id, u.email, u.name, 'isActive:', u.isActive, 'isDeleted:', u.isDeleted);
    console.log('Roles:', u.userRoles.map(ur => ur.role.name));
    const testAdmin = await bcryptjs.compare('admin123', u.password);
    console.log('Password "admin123" matches?:', testAdmin);
  }
}

checkUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
