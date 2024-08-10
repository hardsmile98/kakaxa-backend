import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ids = [1];

async function main() {
  try {
    await prisma.userTask.deleteMany({
      where: {
        taskId: {
          in: ids,
        },
      },
    });

    await prisma.task.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    console.log('Все задания удалены');
  } catch (e) {
    console.log('Ошибка delete tasks: ', e.message);
  }
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
