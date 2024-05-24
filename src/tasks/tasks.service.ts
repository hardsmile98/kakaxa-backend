import { BadRequestException, Injectable } from '@nestjs/common';
import { TgUser } from 'src/global/decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { TaskDto } from './dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class TasksService {
  constructor(
    private prismaService: PrismaService,
    private userService: UsersService,
  ) {}

  async getTasks(user: TgUser) {
    try {
      const tasks = await this.prismaService.userTask.findMany({
        where: {
          userId: user.id,
        },
        include: {
          task: true,
        },
        orderBy: {
          id: 'asc',
        },
      });

      const formatted = tasks.map(({ id, completed, task }) => ({
        ...task,
        id,
        completed,
      }));

      return {
        tasks: formatted,
        success: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async completeTask(user: TgUser, task: TaskDto) {
    try {
      const userTask = await this.prismaService.userTask.findFirst({
        where: { id: task.taskId },
        include: {
          task: {
            select: {
              bonus: true,
            },
          },
        },
      });

      if (userTask.completed) {
        throw new BadRequestException('Задание уже выполнено');
      }

      await this.userService.addScore(user, userTask.task.bonus);

      await this.prismaService.userTask.update({
        where: { id: task.taskId, userId: user.id },
        data: { completed: true },
      });

      return {
        success: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
