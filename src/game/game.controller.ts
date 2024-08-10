import { Body, Controller, Post } from '@nestjs/common';
import { GameService } from './game.service';
import { GetUser, TgUser } from 'src/global';
import { GameDto, StartGameDto } from './dto';

@Controller('game')
export class GameController {
  constructor(private gameService: GameService) {}

  @Post('/start')
  startGame(@GetUser() user: TgUser, @Body() dto: StartGameDto) {
    return this.gameService.startGame(user, dto);
  }

  @Post('/end')
  endGame(@GetUser() user: TgUser, @Body() game: GameDto) {
    return this.gameService.endGame(user, game);
  }
}
