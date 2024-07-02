import { BadRequestException, Injectable } from '@nestjs/common';
import { TgUser } from 'src/global/decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { generate } from 'short-uuid';
import { NftQuery } from './dto';
import { TonapiService } from 'src/tonapi/tonapi.service';

@Injectable()
export class UsersService {
  constructor(
    private prismaService: PrismaService,
    private tonapiService: TonapiService,
  ) {}

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

  async getProfile(user: TgUser) {
    try {
      const findedUser = await this.prismaService.user.findUnique({
        where: { userId: user.id },
      });

      if (!findedUser) {
        const newUser = await this.createUser(user);

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

  async createUser(user: TgUser) {
    if (user.refCode) {
      await this.checkRefCode(user.refCode, user);
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
        refCode: user.refCode,
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

  async checkRefCode(refCode: string, user: TgUser) {
    const findedUser = await this.prismaService.user.findFirst({
      where: { inviteCode: refCode },
    });

    if (findedUser) {
      const bonusForInvite = this.BONUS_FOR_INVITE;

      await this.increaseScore(user, bonusForInvite);
    }
  }

  async decreaseScore(user: TgUser, count: number) {
    const findedUser = await this.prismaService.user.findFirst({
      where: { userId: user.id },
    });

    await this.prismaService.user.update({
      where: { userId: user.id },
      data: {
        score: findedUser.score - count,
      },
    });

    await this.prismaService.userScore.create({
      data: {
        userId: user.id,
        type: 'descrease',
        count: count,
      },
    });

    return true;
  }

  async increaseScore(user: TgUser, count: number) {
    const findedUser = await this.prismaService.user.findFirst({
      where: { userId: user.id },
    });

    await this.prismaService.user.update({
      where: { userId: user.id },
      data: {
        score: findedUser.score + count,
      },
    });

    await this.prismaService.userScore.create({
      data: {
        userId: user.id,
        type: 'increase',
        count: count,
      },
    });

    return true;
  }

  async getLeadboard(user: TgUser) {
    try {
      const top100 = await this.prismaService.$queryRawUnsafe<
        {
          userId: number;
          score: number;
          name: string;
          username: string;
        }[]
      >(
        `SELECT u.name, u.username, t."userId", SUM(t.count) AS score
        FROM public."UserScore" t
        INNER JOIN public."User" u ON t."userId" = u."userId"
        WHERE t.type = 'increase'
        GROUP BY t."userId", u.name, u.username
        ORDER BY score DESC
        LIMIT 100;`,
      );

      const [position] = await this.prismaService.$queryRawUnsafe<
        {
          score: number;
          index: number;
        }[]
      >(
        `SELECT index, score 
        FROM (
          SELECT "userId", SUM(count) AS score, ROW_NUMBER() OVER (ORDER BY SUM(count) DESC) AS index 
          FROM public."UserScore" 
          WHERE type = 'increase' GROUP BY "userId"
        ) as t
        WHERE t."userId" = ${user.id}`,
      );

      return {
        top: top100,
        position: position,
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

  async getNftBonus(nftQuery: NftQuery) {
    const BONUS_FOR_NFT = 0.1;
    const MAX_NFT_BONUS = 0.5;

    try {
      if (!nftQuery.address) {
        return {
          bonus: 0,
          success: true,
        };
      }

      const data = await this.tonapiService.getNftByAddress(nftQuery.address);

      const nftCount = data?.nft_items?.length || 0;

      const bonusForNft = nftCount * BONUS_FOR_NFT;

      const bonus = bonusForNft > MAX_NFT_BONUS ? MAX_NFT_BONUS : bonusForNft;

      return {
        bonus,
        success: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
