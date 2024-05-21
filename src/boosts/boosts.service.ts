import { Injectable } from '@nestjs/common';
import { TgUser } from 'src/global/decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { BoostDto } from './dto';

@Injectable()
export class BoostsService {
  constructor(private prismaService: PrismaService) {}

  async getBoosts(user: TgUser) {
    try {
      const boosts = await this.prismaService.userBoost.findMany({
        where: {
          userId: user.id,
        },
        include: {
          boost: true,
        },
      });

      return {
        success: true,
        boosts: boosts.map(({ boost, ...rest }) => ({
          ...boost,
          ...rest,
        })),
      };
    } catch (e) {
      return {
        success: false,
        message: 'Произошла непредвиденная ошибка',
      };
    }
  }

  async applyBoost(user: TgUser, boost: BoostDto) {
    try {
      const userBoost = await this.prismaService.userBoost.findFirst({
        where: { id: boost.boostId },
        include: {
          boost: {
            select: {
              slug: true,
            },
          },
        },
      });

      if (userBoost.availableCount === 0) {
        return {
          success: false,
          message: 'У вас нет доступных бустов',
        };
      }

      await this.prismaService.userBoost.update({
        data: {
          lastUseTimestamp: Date.now().toString(),
          availableCount: userBoost.availableCount - 1,
        },
        where: {
          id: userBoost.id,
          userId: user.id,
        },
      });

      switch (userBoost.boost.slug) {
        case 'energy': {
          const findedUser = await this.prismaService.user.findUnique({
            where: { userId: user.id },
          });

          if (findedUser.amountEnergy === 3) {
            return {
              success: false,
              message: 'У вас уже полный запас энергии',
            };
          }

          await this.prismaService.user.update({
            where: { userId: user.id },
            data: {
              amountEnergy: findedUser.amountEnergy + 1,
            },
          });

          break;
        }
        default: {
          break;
        }
      }

      return {
        success: true,
      };
    } catch (e) {
      return {
        success: false,
        message: 'Произошла непредвиденная ошибка',
      };
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

      if (
        !userBoost.boost.canImproved ||
        userBoost.level === userBoost.boost.maxLevel
      ) {
        return {
          success: false,
          message: 'Нельзя улучшить буст',
        };
      }

      const findedUser = await this.prismaService.user.findUnique({
        where: { userId: user.id },
      });

      if (findedUser.currentScore < userBoost.boost.levelPrice) {
        return {
          success: false,
          message: 'Не хватает КАКАХ для улучшения',
        };
      }

      await this.prismaService.user.update({
        where: { userId: user.id },
        data: {
          currentScore: findedUser.currentScore - userBoost.boost.levelPrice,
        },
      });

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
      return {
        success: false,
        message: 'Произошла непредвиденная ошибка',
      };
    }
  }
}
