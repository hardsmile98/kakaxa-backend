import { BadRequestException, Injectable } from '@nestjs/common';
import { TgUser } from 'src/global/decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { generate } from 'short-uuid';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  async getProfile(user: TgUser, refCode?: string) {
    try {
      const findedUser = await this.prismaService.user.findUnique({
        where: { userId: user.id },
      });

      if (!findedUser) {
        const newUser = await this.createUser(user, refCode);

        return {
          success: true,
          newUser: true,
          user: newUser,
        };
      }

      return {
        success: true,
        newUser: false,
        user: findedUser,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async createUser(user: TgUser, refCode?: string) {
    if (refCode) {
      await this.checkRefCode(refCode);
    }

    const inviteCode = generate();

    const tasks = await this.prismaService.task.findMany({
      select: { id: true },
    });

    const boosts = await this.prismaService.boost.findMany({
      select: {
        id: true,
        slug: true,
      },
    });

    const newUser = await this.prismaService.user.create({
      include: {
        userBoosts: true,
        userTasks: true,
      },
      data: {
        userId: user.id,
        name: user.first_name,
        username: user.username,
        inviteCode,
        refCode,
        userBoosts: {
          createMany: {
            data: boosts.map(({ id, slug }) => ({
              boostId: id,
              availableCount: slug === 'devourer' ? 2 : 1,
            })),
          },
        },
        userTasks: {
          createMany: {
            data: tasks.map(({ id }) => ({
              taskId: id,
            })),
          },
        },
      },
    });

    delete newUser.userBoosts;
    delete newUser.userTasks;

    return newUser;
  }

  async checkRefCode(refCode: string) {
    const findedUser = await this.prismaService.user.findFirst({
      where: { inviteCode: refCode },
    });

    if (findedUser) {
      const bonusForInvite = 100;

      await this.prismaService.user.update({
        where: {
          userId: findedUser.userId,
        },
        data: {
          allScore: findedUser.allScore + bonusForInvite,
          leadboardScore: findedUser.leadboardScore + bonusForInvite,
          currentScore: findedUser.currentScore + bonusForInvite,
        },
      });
    }
  }

  async addScore(user: TgUser, count: number) {
    const findedUser = await this.prismaService.user.findFirst({
      where: { userId: user.id },
    });

    await this.prismaService.user.update({
      where: {
        userId: user.id,
      },
      data: {
        allScore: findedUser.allScore + count,
        leadboardScore: findedUser.leadboardScore + count,
        currentScore: findedUser.currentScore + count,
      },
    });

    return true;
  }

  async getLeadboard(user: TgUser) {
    try {
      const top100 = await this.prismaService.user.findMany({
        take: 100,
        orderBy: [{ leadboardScore: 'desc' }],
        select: {
          userId: true,
          leadboardScore: true,
          name: true,
          username: true,
        },
      });

      const [row] = await this.prismaService.$queryRawUnsafe<
        {
          index: number;
          leadboardScore: number;
        }[]
      >(
        `SELECT index, "leadboardScore" from 
        (SELECT row_number() OVER w as index, "userId", "leadboardScore" 
        FROM public."User" WINDOW w AS (ORDER BY "leadboardScore" DESC))
        u where u."userId" = ${user.id};`,
      );

      return {
        top: top100,
        position: row,
        success: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getReferals(user: TgUser) {
    try {
      const findedUser = await this.prismaService.user.findUnique({
        where: { userId: user.id },
        select: {
          inviteCode: true,
        },
      });

      const referals = await this.prismaService.user.findMany({
        where: {
          refCode: findedUser.inviteCode,
        },
        select: {
          userId: true,
          name: true,
          username: true,
        },
      });

      return {
        referals,
        success: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
