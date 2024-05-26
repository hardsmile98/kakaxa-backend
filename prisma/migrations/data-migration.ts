import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const addTasks = async () => {
  await prisma.task.createMany({
    data: [
      { title: 'Подписка на канал', bonus: 100, link: 'https://www.google.ru' },
      { title: 'Подписка на чат', bonus: 100, link: 'https://www.google.ru' },
    ],
  });
};

const addBoosts = async () => {
  await prisma.boost.createMany({
    data: [
      {
        title: 'Пожиратель',
        slug: 'devourer',
        description:
          'Пожирает все на своем пути в течение {duration} секунд, нажми на кнопку “Применить”, возвращайся в игру и собирай КАКАХИ',
        allCount: 2,
        type: 'daily',
      },
      {
        title: 'Энергия',
        slug: 'energy',
        type: 'daily',
        description: 'Восстанавливает 1 единицу энергии',
        improveTitle: 'Время игры +5 сек.',
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
