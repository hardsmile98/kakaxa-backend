import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { UsersService } from 'src/users/users.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, UsersService],
})
export class TasksModule {}
