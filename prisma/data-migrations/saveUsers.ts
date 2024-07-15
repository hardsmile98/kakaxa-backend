import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

const saveUsers = async () => {
  const users = await prisma.user.findMany({});
  const formatted = users.map((user) => ({
    ...user,
    userId: String(user.userId),
  }));

  writeFileSync(
    'prisma/data-migrations/users.json',
    JSON.stringify(formatted),
    'utf-8',
  );
};

async function main() {
  try {
    await saveUsers();
  } catch (e) {
    console.log('Ошибка save users: ', e.message);
  }
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
