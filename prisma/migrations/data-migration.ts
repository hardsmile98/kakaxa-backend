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
        title: 'Магнит',
        slug: 'magnit',
        description:
          'Притягивает все КАКАХИ в течение {duration} секунд, нажми на кнопку “Применить”, возвращайся в игру и собирай КАКАХИ',
        allCount: 2,
        type: 'daily',
        recoverySeconds: 12 * 60 * 60,
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
        recoverySeconds: 4 * 60 * 60,
      },
    ],
  });
};

async function main() {
  try {
    await addTasks();
    await addBoosts();
  } catch (e) {
    console.log('Ошибка data-migration: ', e.message);
  }
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
