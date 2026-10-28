const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.user.count();
    console.log('✅ DB connected via Prisma. User count:', count);
  } catch (e) {
    console.error('❌ DB error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();