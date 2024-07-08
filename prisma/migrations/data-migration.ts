import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const addTasks = async () => {
  await prisma.task.createMany({
    data: [
      {
        title: 'Подписка на основной канал',
        bonus: 100,
        linkType: 'telegram',
        link: 'https://t.me/kakaxa_coin',
      },
      {
        title: 'Подписка на X',
        bonus: 100,
        link: 'https://x.com/kakaxa_ton',
      },
      {
        title: 'Подписка на EN CHAT',
        bonus: 100,
        linkType: 'telegram',
        link: 'https://t.me/kakaxa_ton_en',
      },
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
          'Притягивает все KKX POITNS в течение {duration} секунд, нажми на кнопку “Применить”, возвращайся в игру и собирай KKX POITNS',
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
        allCount: 2,
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
