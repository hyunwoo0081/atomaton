import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  // Developer User
  const developer = await prisma.user.upsert({
    where: { email: 'dev@atomaton.com' },
    update: {},
    create: {
      email: 'dev@atomaton.com',
      password,
      is_developer: true,
    },
  });

  // Regular User
  const user = await prisma.user.upsert({
    where: { email: 'user@atomaton.com' },
    update: {},
    create: {
      email: 'user@atomaton.com',
      password,
      is_developer: false,
    },
  });

  console.log({ developer, user });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
