import { BadRequestException, Injectable } from '@nestjs/common';
import { TgUser } from 'src/global/decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { generate } from 'short-uuid';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  ENERGY_RECOVERY_TIME_SECONDS = 60 * 60 * 8;
  BONUS_FOR_INVITE = 100;
  MAX_AMOUNT_ENERGY = 3;

  async checkEnergy(user: TgUser) {
    try {
      const findedUser = await this.prismaService.user.findUnique({
        where: { userId: user.id },
      });

      if (findedUser.amountEnergy === this.MAX_AMOUNT_ENERGY) {
        return {
          success: true,
          recovery: false,
        };
      }

      const secondsLeft = Math.round(
        (Date.now() - Number(findedUser.useEneryTimestamp)) / 1000,
      );

      const recoveryEnergyCount = Math.floor(
        secondsLeft / this.ENERGY_RECOVERY_TIME_SECONDS,
      );

      if (recoveryEnergyCount === 0) {
        return {
          success: true,
          recovery: false,
        };
      }

      if (recoveryEnergyCount >= this.MAX_AMOUNT_ENERGY) {
        await this.prismaService.user.update({
          where: {
            userId: findedUser.userId,
          },
          data: {
            amountEnergy: this.MAX_AMOUNT_ENERGY,
            useEneryTimestamp: null,
          },
        });
      } else {
        const newTimestamp =
          Number(findedUser.useEneryTimestamp) +
          recoveryEnergyCount * this.ENERGY_RECOVERY_TIME_SECONDS * 1_000;

        const newEnergy = findedUser.amountEnergy + recoveryEnergyCount;

        await this.prismaService.user.update({
          where: {
            userId: findedUser.userId,
          },
          data: {
            amountEnergy: newEnergy,
            useEneryTimestamp: newTimestamp.toString(),
          },
        });
      }

      return {
        success: true,
        recovery: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

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
          user: {
            ...newUser,
            energyRecoveryTimeSeconds: this.ENERGY_RECOVERY_TIME_SECONDS,
          },
        };
      }

      return {
        success: true,
        newUser: false,
        user: {
          ...findedUser,
          energyRecoveryTimeSeconds: this.ENERGY_RECOVERY_TIME_SECONDS,
        },
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
      const bonusForInvite = this.BONUS_FOR_INVITE;

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
