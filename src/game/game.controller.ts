import { Body, Controller, Post } from '@nestjs/common';
import { GameService } from './game.service';
import { GetUser, TgUser } from 'src/global/decorator';
import { GameDto } from './dto';

@Controller('game')
export class GameController {
  constructor(private gameService: GameService) {}

  @Post('/start')
  startGame(@GetUser() user: TgUser) {
    return this.gameService.startGame(user);
  }

  @Post('/end')
  endGame(@GetUser() user: TgUser, @Body() game: GameDto) {
    return this.gameService.endGame(user, game);
  }
}
