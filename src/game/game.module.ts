import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { UsersModule } from 'src/users/users.module';
import { BoostsModule } from 'src/boosts/boosts.module';

@Module({
  providers: [GameService],
  controllers: [GameController],
  imports: [UsersModule, BoostsModule],
})
export class GameModule {}
