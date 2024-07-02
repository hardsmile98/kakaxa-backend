import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { BoostsService } from 'src/boosts/boosts.service';
import { UsersService } from 'src/users/users.service';

@Module({
  providers: [GameService, BoostsService, UsersService],
  controllers: [GameController],
})
export class GameModule {}
