import { Module } from '@nestjs/common';
import { BoostsController } from './boosts.controller';
import { BoostsService } from './boosts.service';
import { UsersService } from 'src/users/users.service';

@Module({
  controllers: [BoostsController],
  providers: [BoostsService, UsersService],
})
export class BoostsModule {}
