import bcrypt from 'bcryptjs';
import prisma from './config/db';

const AUTH_USERS = [
  {
    userId: '11111111-1111-1111-1111-111111111111',
    email: 'alice@breezy.local',
    password: 'Password123!',
  },
  {
    userId: '22222222-2222-2222-2222-222222222222',
    email: 'bob@breezy.local',
    password: 'Password123!',
  },
  {
    userId: '33333333-3333-3333-3333-333333333333',
    email: 'charlie@breezy.local',
    password: 'Password123!',
  },
];

async function main() {
  await prisma.refreshToken.deleteMany();
  await prisma.authUser.deleteMany();

  for (const user of AUTH_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    await prisma.authUser.create({
      data: {
        userId: user.userId,
        email: user.email,
        passwordHash,
      },
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.userId,
        token: `${user.userId}-seed-refresh-token`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`[auth-service] Seed termine: ${AUTH_USERS.length} comptes auth inseres.`);
}

main()
  .catch((error) => {
    console.error('[auth-service] Seed error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
