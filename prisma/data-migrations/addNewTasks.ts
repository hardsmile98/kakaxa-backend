import { LinkType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const newTasksArray = [
  {
    title: 'Enoki 💸 Alpha Calls 1000X',
    bonus: 100,
    linkType: 'telegram' as LinkType,
    link: 'https://t.me/enokicrypto',
  },
  {
    title: 'Pokemon Ball',
    bonus: 100,
    linkType: 'telegram' as LinkType,
    link: 'https://t.me/PokemonBall_bot',
  },
];

const addTasks = async () => {
  const newTasks = await Promise.all(
    newTasksArray.map(async (taks) => {
      const created = await prisma.task.create({
        data: taks,
      });

      return created;
    }),
  );

  return newTasks.map((el) => el.id);
};

async function main() {
  try {
    const newTasks = await addTasks();

    const userIds = await prisma.user.findMany({ select: { userId: true } });

    await Promise.all(
      userIds.map(async ({ userId }) => {
        try {
          await prisma.userTask.createMany({
            data: newTasks.map((taskId) => ({
              userId,
              taskId,
            })),
          });
        } catch (e) {
          console.log(`Ошибка добавления заданий пользователю ${userId}`, e);
        }
      }),
    );

    console.log('Все задания добавлены');
  } catch (e) {
    console.log('Ошибка add new tasks: ', e.message);
  }
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
