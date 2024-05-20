import { IsNumber } from 'class-validator';

export class TaskDto {
  @IsNumber()
  taskId: number;
}
