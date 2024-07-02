import { Module } from '@nestjs/common';
import { BoostsController } from './boosts.controller';
import { BoostsService } from './boosts.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  controllers: [BoostsController],
  providers: [BoostsService],
  imports: [UsersModule],
  exports: [BoostsService],
})
export class BoostsModule {}
