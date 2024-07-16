import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { BoostsModule } from './boosts/boosts.module';
import { TasksModule } from './tasks/tasks.module';
import { GameModule } from './game/game.module';
import { TonapiModule } from './tonapi/tonapi.module';
import { checkSignature } from './global/middlewares';

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
    TonapiModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(checkSignature).forRoutes('*');
  }
}
