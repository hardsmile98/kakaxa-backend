import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const addTasks = async () => {
  await prisma.task.createMany({
    data: [
      { title: 'Подписка на канал', bonus: 300, link: '' },
      { title: 'Подписка на чат', bonus: 300, link: '' },
    ],
  });
};

const addBoosts = async () => {
  await prisma.boost.createMany({
    data: [
      {
        title: 'Пожиратель',
        slug: 'devourer',
        allCount: 2,
      },
      {
        title: 'Энергия',
        slug: 'energy',
        allCount: 1,
        levelPrice: 300,
        maxLevel: 10,
        canImproved: true,
      },
    ],
  });
};

async function main() {
  await addTasks();
  await addBoosts();
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
