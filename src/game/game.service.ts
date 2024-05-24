import { BadRequestException, Injectable } from '@nestjs/common';
import { TgUser } from 'src/global/decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { GameDto } from './dto';

@Injectable()
export class GameService {
  constructor(private prismaService: PrismaService) {}

  async startGame(user: TgUser) {
    try {
      const findedUser = await this.prismaService.user.findUnique({
        where: { userId: user.id },
      });

      if (findedUser.amountEnergy <= 0) {
        throw new BadRequestException('Недостаточно энергии для старта игры');
      }

      await this.prismaService.user.update({
        where: { userId: user.id },
        data: {
          amountEnergy: findedUser.amountEnergy - 1,
        },
      });

      const hash = uuidv4();

      const newGame = await this.prismaService.userGame.create({
        data: {
          userId: user.id,
          hash,
          startTime: Date.now().toString(),
        },
      });

      return {
        game: {
          hash,
          id: newGame.id,
        },
        success: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async endGame(user: TgUser, game: GameDto) {
    const maxDiffSeconds = 120;
    const maxScoreInGame = 500;

    try {
      const findedGame = await this.prismaService.userGame.findUnique({
        where: {
          id: game.id,
          hash: game.hash,
          userId: user.id,
        },
      });

      const findedUser = await this.prismaService.user.findUnique({
        where: { userId: user.id },
      });

      if (!findedGame || !findedUser) {
        throw new BadRequestException('Пользователь или игра не найдена');
      }

      if (findedGame.endTime) {
        throw new BadRequestException('Игра уже завершена');
      }

      const now = Date.now().toString();
      const diffSeconds = (Number(now) - Number(findedGame.startTime)) / 1000;

      if (diffSeconds > maxDiffSeconds) {
        throw new BadRequestException(
          'Прошло слишком много времени для завершения игры',
        );
      }

      if (game.score > maxScoreInGame) {
        throw new BadRequestException('Собрано слишком много КАКАХ');
      }

      await this.prismaService.userGame.update({
        where: { id: findedGame.id },
        data: {
          score: game.score,
          endTime: Date.now().toString(),
        },
      });

      await this.prismaService.user.update({
        where: { userId: user.id },
        data: {
          allScore: findedUser.allScore + game.score,
          leadboardScore: findedUser.leadboardScore + game.score,
          currentScore: findedUser.currentScore + game.score,
        },
      });

      return {
        success: true,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
