import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const addTasks = async () => {
  await prisma.task.createMany({
    data: [
      {
        title: 'Subscribe to main channel',
        bonus: 100,
        linkType: 'telegram',
        link: 'https://t.me/kkxlove',
      },
      {
        title: '$KAKAXA',
        bonus: 100,
        linkType: 'telegram',
        link: 'https://t.me/kakaxa_coin',
      },
      {
        title: 'ROMANOVICH',
        bonus: 50,
        linkType: 'telegram',
        link: 'https://t.me/cryptozbro',
      },
      {
        title: 'CRYPTOBRAT',
        bonus: 50,
        linkType: 'telegram',
        link: 'https://t.me/cryptobraze',
      },
    ],
  });
};

const addBoosts = async () => {
  await prisma.boost.createMany({
    data: [
      {
        title: 'Magnet',
        slug: 'magnit',
        description:
          'Pulls in all KKX points for {duration} seconds, press the "apply" button, return to the game and collect KKX points',
        allCount: 2,
        type: 'daily',
        recoverySeconds: 12 * 60 * 60,
      },
      {
        title: 'Energy',
        slug: 'energy',
        type: 'daily',
        description: 'Restores 1 unit of energy',
        improveTitle: 'Game time +5 seconds',
        allCount: 2,
        basePrice: 300,
        maxLevel: 10,
        canImproved: true,
        recoverySeconds: 12 * 60 * 60,
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
