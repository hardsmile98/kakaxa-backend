import { Body, Controller, Get, Post } from '@nestjs/common';
import { GetUser, TgUser } from 'src/global/decorator';
import { TasksService } from './tasks.service';
import { TaskDto } from './dto';

@Controller('tasks')
export class TasksController {
  constructor(private taskService: TasksService) {}

  @Get('/')
  getTasks(@GetUser() user: TgUser) {
    return this.taskService.getTasks(user);
  }

  @Post('/')
  completeTask(@GetUser() user: TgUser, @Body() task: TaskDto) {
    return this.taskService.completeTask(user, task);
  }
}
