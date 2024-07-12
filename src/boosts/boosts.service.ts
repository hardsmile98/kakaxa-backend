import { BadRequestException, Injectable } from '@nestjs/common';
import { TgUser } from 'src/global/decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { BoostDto } from './dto';
import { UsersService } from 'src/users/users.service';
import { settings } from 'src/global/constants';

@Injectable()
export class BoostsService {
  constructor(
    private prismaService: PrismaService,
    private usersService: UsersService,
  ) {}

  async getBoosts(user: TgUser) {
    try {
      const boosts = await this.prismaService.userBoost.findMany({
        where: {
          userId: user.id,
        },
        include: {
          boost: true,
        },
        orderBy: {
          id: 'asc',
        },
      });

      const isRecovery = boosts.some((boost) => !!boost.useTimestamp);

      if (!isRecovery) {
        return {
          success: true,
          boosts: boosts.map(({ boost, ...rest }) => ({
            ...boost,
            ...rest,
          })),
        };
      }

      const boostsFiltered = boosts.filter((boost) => !!boost.useTimestamp);

      const newBoosts = boostsFiltered
        .map((boost) => {
          const secondsLeft = Math.round(
            (Date.now() - Number(boost.useTimestamp)) / 1000,
          );

          const recoveryCount = Math.floor(
            secondsLeft / boost.boost.recoverySeconds,
          );

          if (recoveryCount === 0) {
            return null;
          }

          if (recoveryCount >= boost.boost.allCount) {
            return {
              id: boost.id,
              newUseTimestamp: null,
              newAvailableCount: boost.boost.allCount,
            };
          }

          const newUseTimestamp =
            Number(boost.useTimestamp) +
            recoveryCount * boost.boost.recoverySeconds * 1_000;

          const newAvailableCount = boost.availableCount + recoveryCount;

          return {
            id: boost.id,
            newUseTimestamp: newUseTimestamp.toString(),
            newAvailableCount,
          };
        })
        .filter(Boolean);

      if (newBoosts.length === 0) {
        return {
          success: true,
          boosts: boosts.map(({ boost, ...rest }) => ({
            ...boost,
            ...rest,
          })),
        };
      }

      await Promise.all(
        newBoosts.map((boost) => {
          return this.prismaService.userBoost.update({
            where: {
              id: boost.id,
            },
            data: {
              useTimestamp: boost.newUseTimestamp,
              availableCount: boost.newAvailableCount,
            },
          });
        }),
      );

      const boostsUpdated = await this.prismaService.userBoost.findMany({
        where: {
          userId: user.id,
        },
        include: {
          boost: true,
        },
        orderBy: {
          id: 'asc',
        },
      });

      return {
        success: true,
        boosts: boostsUpdated.map(({ boost, ...rest }) => ({
          ...boost,
          ...rest,
        })),
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async applyBoost(user: TgUser, boost: BoostDto) {
    try {
      const userBoost = await this.prismaService.userBoost.findFirst({
        where: { id: boost.boostId, userId: user.id },
        include: {
          boost: {
            select: {
              slug: true,
            },
          },
        },
      });

      if (!userBoost) {
        throw new BadRequestException('Such a boost does not exist');
      }

      if (userBoost.availableCount === 0) {
        throw new BadRequestException('You have no boosts available');
      }

      switch (userBoost.boost.slug) {
        case 'energy': {
          const findedUser = await this.prismaService.user.findUnique({
            where: { userId: user.id },
          });

          if (findedUser.amountEnergy === 3) {
            throw new BadRequestException(
              'You already have a full supply of energy',
            );
          }

          const newEnergy = findedUser.amountEnergy + 1;

          await this.prismaService.user.update({
            where: { userId: user.id },
            data: {
              amountEnergy:
                newEnergy >= settings.MAX_ENERGY
                  ? settings.MAX_ENERGY
                  : newEnergy,
            },
          });

          break;
        }
        default: {
          break;
        }
      }

      await this.prismaService.userBoost.update({
        data: {
          useTimestamp: userBoost.useTimestamp
            ? userBoost.useTimestamp
            : Date.now().toString(),
          availableCount: userBoost.availableCount - 1,
        },
        where: {
          id: userBoost.id,
          userId: user.id,
        },
      });

      return {
        success: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async improveBoost(user: TgUser, boost: BoostDto) {
    try {
      const userBoost = await this.prismaService.userBoost.findFirst({
        where: { id: boost.boostId },
        include: {
          boost: true,
        },
      });

      if (!userBoost) {
        throw new BadRequestException('Such a boost does not exist');
      }

      if (
        !userBoost.boost.canImproved ||
        userBoost.level === userBoost.boost.maxLevel
      ) {
        throw new BadRequestException('Boost cannot be improved');
      }

      const findedUser = await this.prismaService.user.findUnique({
        where: { userId: user.id },
      });

      if (findedUser.score < userBoost.upgradePrice) {
        throw new BadRequestException('Not enough KKXP to improve');
      }

      await this.usersService.decreaseScore(user, userBoost.upgradePrice);

      switch (userBoost.boost.slug) {
        case 'energy': {
          const newLevel = userBoost.level + 1;

          await this.prismaService.user.update({
            where: { userId: user.id },
            data: {
              gameTime: findedUser.gameTime + 5,
            },
          });

          await this.prismaService.userBoost.update({
            where: { id: boost.boostId },
            data: {
              upgradePrice: userBoost.upgradePrice + userBoost.boost.basePrice,
              level: newLevel,
            },
          });

          break;
        }
        default:
          break;
      }

      return {
        success: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
