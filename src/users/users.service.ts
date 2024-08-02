import { BadRequestException, Injectable } from '@nestjs/common';
import { TgUser } from 'src/global/decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { generate } from 'short-uuid';
import { format } from 'date-fns';
import { NftQuery } from './dto';
import { TonapiService } from 'src/tonapi/tonapi.service';
import { settings } from 'src/global/constants';
import { DailyReward, Reason } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prismaService: PrismaService,
    private tonapiService: TonapiService,
  ) {}

  async checkEnergy(user: TgUser) {
    try {
      const findedUser = await this.prismaService.user.findUnique({
        where: { userId: user.id },
      });

      if (findedUser.amountEnergy === settings.MAX_ENERGY) {
        return {
          success: true,
          recovery: false,
        };
      }

      const secondsLeft = Math.round(
        (Date.now() - Number(findedUser.useEneryTimestamp)) / 1000,
      );

      const recoveryEnergyCount = Math.floor(
        secondsLeft / settings.ENERGY_RECOVERY_TIME_SECONDS,
      );

      if (recoveryEnergyCount === 0) {
        return {
          success: true,
          recovery: false,
        };
      }

      if (recoveryEnergyCount >= settings.MAX_ENERGY) {
        await this.prismaService.user.update({
          where: {
            userId: findedUser.userId,
          },
          data: {
            amountEnergy: settings.MAX_ENERGY,
            useEneryTimestamp: null,
          },
        });
      } else {
        const newTimestamp =
          Number(findedUser.useEneryTimestamp) +
          recoveryEnergyCount * settings.ENERGY_RECOVERY_TIME_SECONDS * 1_000;

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
            energyRecoveryTimeSeconds: settings.ENERGY_RECOVERY_TIME_SECONDS,
          },
        };
      }

      return {
        success: true,
        newUser: false,
        user: {
          ...findedUser,
          energyRecoveryTimeSeconds: settings.ENERGY_RECOVERY_TIME_SECONDS,
        },
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async createUser(user: TgUser) {
    const inviteCode = generate();

    const tasks = await this.prismaService.task.findMany({
      select: { id: true },
    });

    const boosts = await this.prismaService.boost.findMany({
      select: {
        id: true,
        slug: true,
        allCount: true,
        basePrice: true,
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
        isPremium: user.is_premium,
        userBoosts: {
          createMany: {
            data: boosts.map(({ id, allCount, basePrice }) => ({
              boostId: id,
              availableCount: allCount,
              upgradePrice: basePrice,
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

    if (user.refCode) {
      await this.checkRefCode(user.refCode, user.id);
    }

    await this.prismaService.userScore.createMany({
      data: [
        {
          userId: user.id,
          count: 0,
          type: 'increase',
          reason: 'game',
        },
        {
          userId: user.id,
          count: 0,
          type: 'increase',
          reason: 'invite',
        },
      ],
    });

    delete newUser.userBoosts;
    delete newUser.userTasks;

    return newUser;
  }

  async checkRefCode(refCode: string, userId: bigint) {
    const findedUser = await this.prismaService.user.findFirst({
      where: { inviteCode: refCode },
    });

    if (findedUser) {
      await this.prismaService.referral.create({
        data: {
          referrerId: userId,
          referredById: findedUser.userId,
        },
      });
    }
  }

  async decreaseScore(userId: bigint, count: number) {
    const findedUser = await this.prismaService.user.findFirst({
      where: { userId: userId },
    });

    await this.prismaService.user.update({
      where: { userId: userId },
      data: {
        score: Number((findedUser.score - count).toFixed(3)),
      },
    });

    await this.prismaService.userScore.create({
      data: {
        userId: userId,
        type: 'descrease',
        count: Number(count.toFixed(3)),
      },
    });

    return true;
  }

  async increaseScore(userId: bigint, count: number, reason: Reason) {
    const findedUser = await this.prismaService.user.findFirst({
      where: { userId: userId },
    });

    if (!findedUser) {
      return false;
    }

    await this.prismaService.user.update({
      where: { userId: findedUser.userId },
      data: {
        score: Number((findedUser.score + count).toFixed(3)),
      },
    });

    await this.prismaService.userScore.create({
      data: {
        reason,
        userId: findedUser.userId,
        type: 'increase',
        count: Number(count.toFixed(3)),
      },
    });

    return true;
  }

  async getLeadboard(user: TgUser) {
    const LIMIT = 300;

    try {
      const topFarm = await this.prismaService.$queryRawUnsafe<
        {
          score: number;
          name: string;
          username: string;
        }[]
      >(
        `SELECT u.name, u.username, t."userId", SUM(t.count) AS score
        FROM public."UserScore" t
        INNER JOIN public."User" u ON t."userId" = u."userId"
        WHERE t.type = 'increase' AND t.reason = 'game'
        GROUP BY t."userId", u.name, u.username
        ORDER BY score DESC
        LIMIT ${LIMIT};`,
      );

      const [positionFarm] = await this.prismaService.$queryRawUnsafe<
        {
          score: number;
          index: number;
        }[]
      >(
        `SELECT index, score 
        FROM (
          SELECT "userId", SUM(count) AS score, ROW_NUMBER() OVER (ORDER BY SUM(count) DESC) AS index 
          FROM public."UserScore" 
          WHERE type = 'increase' AND reason = 'game' GROUP BY "userId"
        ) as t
        WHERE t."userId" = ${user.id}`,
      );

      const topInvite = await this.prismaService.$queryRawUnsafe<
        {
          score: number;
          name: string;
          username: string;
        }[]
      >(
        `SELECT u.name, u.username, t."userId", SUM(t.count) AS score
        FROM public."UserScore" t
        INNER JOIN public."User" u ON t."userId" = u."userId"
        WHERE t.type = 'increase' AND t.reason = 'invite'
        GROUP BY t."userId", u.name, u.username
        ORDER BY score DESC
        LIMIT ${LIMIT};`,
      );

      const [positionInvite] = await this.prismaService.$queryRawUnsafe<
        {
          score: number;
          index: number;
        }[]
      >(
        `SELECT index, score 
        FROM (
          SELECT "userId", SUM(count) AS score, ROW_NUMBER() OVER (ORDER BY SUM(count) DESC) AS index 
          FROM public."UserScore" 
          WHERE type = 'increase' AND reason = 'invite' GROUP BY "userId"
        ) as t
        WHERE t."userId" = ${user.id}`,
      );

      const activeBattle = await this.prismaService.battle.findFirst({
        where: { NOT: { status: 'finished' } },
        select: {
          status: true,
          startDate: true,
          endDate: true,
        },
      });

      let battle;

      if (activeBattle) {
        const topBattle = await this.prismaService.$queryRawUnsafe<
          {
            score: number;
            name: string;
            username: string;
          }[]
        >(
          `SELECT u.name, u.username, t."userId", SUM(t.count) AS score
          FROM public."UserScore" t
          INNER JOIN public."User" u ON t."userId" = u."userId"
          WHERE t.type = 'increase' AND t.reason = 'game' AND t."createdAt" > '${format(
            activeBattle.startDate,
            'yyyy-MM-dd HH:mm:ss',
          )}' AND  t."createdAt" < '${format(
            activeBattle.endDate,
            'yyyy-MM-dd HH:mm:ss',
          )}'
          GROUP BY t."userId", u.name, u.username
          ORDER BY score DESC
          LIMIT ${LIMIT};`,
        );

        const [positionBattle] = await this.prismaService.$queryRawUnsafe<
          {
            score: number;
            index: number;
          }[]
        >(
          `SELECT index, score 
          FROM (
            SELECT "userId", SUM(count) AS score, ROW_NUMBER() OVER (ORDER BY SUM(count) DESC) AS index 
            FROM public."UserScore" 
            WHERE type = 'increase' AND reason = 'game' AND "createdAt" > '${format(
              activeBattle.startDate,
              'yyyy-MM-dd HH:mm:ss',
            )}' AND  "createdAt" < '${format(
            activeBattle.endDate,
            'yyyy-MM-dd HH:mm:ss',
          )}'  GROUP BY "userId"
          ) as t
          WHERE t."userId" = ${user.id}`,
        );

        battle = {
          top: topBattle,
          position: positionBattle,
        };
      }

      return {
        farm: {
          top: topFarm,
          position: positionFarm,
        },
        invite: {
          top: topInvite,
          position: positionInvite,
        },
        battle: ['running', 'finishing'].includes(activeBattle?.status)
          ? battle
          : null,
        activeBattle,
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
          userId: true,
        },
      });

      if (!findedUser) {
        throw new BadRequestException('User not found');
      }

      const referals = await this.prismaService.referral.findMany({
        where: {
          referredById: findedUser.userId,
          isActivated: true,
        },
        select: {
          referrer: {
            select: {
              isPremium: true,
              userId: true,
              name: true,
              username: true,
            },
          },
        },
      });

      return {
        referals: referals.map((ref) => ({
          ...ref.referrer,
          bonus: ref.referrer.isPremium
            ? settings.BONUS_FOR_INVITE_WITH_PREMIUM
            : settings.BONUS_FOR_INVITE,
        })),
        bonusForInviteWithPremium: settings.BONUS_FOR_INVITE_WITH_PREMIUM,
        bonusForInvite: settings.BONUS_FOR_INVITE,
        success: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getNftBonus(nftQuery: NftQuery) {
    const BONUS_FOR_NFT = 0.05;
    const MAX_NFT_BONUS = 0.5;
    const MAX_NFT_COUNT = 10;

    try {
      if (!nftQuery.walletStateInit) {
        return {
          bonusForNft: BONUS_FOR_NFT,
          maxNftBonus: MAX_NFT_BONUS,
          bonus: 0,
          nftCount: 0,
          maxNftCount: MAX_NFT_COUNT,
          success: true,
        };
      }

      const data = await this.tonapiService.getNftByAddress(
        nftQuery.walletStateInit,
      );

      const nftCount = data.length;

      const bonusForNft = nftCount * BONUS_FOR_NFT;

      const bonus = bonusForNft > MAX_NFT_BONUS ? MAX_NFT_BONUS : bonusForNft;

      return {
        bonusForNft: BONUS_FOR_NFT,
        maxNftBonus: MAX_NFT_BONUS,
        maxNftCount: MAX_NFT_COUNT,
        bonus: Number(bonus.toFixed(3)),
        nftCount,
        success: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async bonusForReferral(userId: bigint, gamesPlayed: number) {
    if (gamesPlayed !== 1) {
      return;
    }

    try {
      const findedReferredRecord = await this.prismaService.referral.findFirst({
        where: {
          referrerId: userId,
          isActivated: false,
        },
        select: {
          id: true,
          referredById: true,
          referrer: {
            select: {
              isPremium: true,
            },
          },
        },
      });

      if (!findedReferredRecord) {
        return;
      }

      await this.prismaService.referral.update({
        where: {
          id: findedReferredRecord.id,
        },
        data: {
          isActivated: true,
        },
      });

      const bonusForInvite = findedReferredRecord.referrer.isPremium
        ? settings.BONUS_FOR_INVITE_WITH_PREMIUM
        : settings.BONUS_FOR_INVITE;

      await this.increaseScore(
        findedReferredRecord.referredById,
        bonusForInvite,
        'invite',
      );
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getStatistics() {
    try {
      const userCount = await this.prismaService.user.count();

      const addUsers = 4_600;

      return {
        count: userCount + addUsers,
        success: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getDayliReward(user: TgUser) {
    const { id: userId } = user;

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const rewardData = await this.prismaService.dailyReward.findUnique({
      where: { userId },
    });

    let rewardRecord: DailyReward | null = null;

    if (rewardData) {
      const lastRewardDate = new Date(rewardData.lastRewardDate);

      lastRewardDate.setHours(0, 0, 0, 0);

      if (lastRewardDate.getTime() !== today.getTime()) {
        rewardRecord = await this.prismaService.dailyReward.update({
          where: { userId },
          data: {
            lastRewardDate: today,
          },
        });
      }
    } else {
      rewardRecord = await this.prismaService.dailyReward.create({
        data: {
          userId,
          lastRewardDate: today,
          rewardAmount: 10,
        },
      });
    }

    if (rewardRecord) {
      delete rewardData.userId;

      delete rewardData.id;

      await this.increaseScore(
        userId,
        rewardRecord.rewardAmount,
        'dailyReward',
      );
    }

    return {
      dailyReward: rewardRecord,
      success: true,
    };
  }
}
