import prisma from './config/db';

const USERS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'alice',
    email: 'alice@breezy.local',
    role: 'admin' as const,
    languagePreference: 'fr',
    themePreference: 'light',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'bob',
    email: 'bob@breezy.local',
    role: 'moderator' as const,
    languagePreference: 'en',
    themePreference: 'dark',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'charlie',
    email: 'charlie@breezy.local',
    role: 'user' as const,
    languagePreference: 'es',
    themePreference: 'light',
  },
];

async function main() {
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: USERS,
  });

  console.log(`[user-service] Seed termine: ${USERS.length} utilisateurs inseres.`);
}

main()
  .catch((error) => {
    console.error('[user-service] Seed error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
