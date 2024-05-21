import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { BoostsModule } from './boosts/boosts.module';
import { TasksModule } from './tasks/tasks.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    BoostsModule,
    TasksModule,
    GameModule,
  ],
})
export class AppModule {}
