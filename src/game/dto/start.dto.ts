import { IsNumber, IsOptional } from 'class-validator';

export class StartGameDto {
  @IsNumber()
  @IsOptional()
  boostId?: number;
}
