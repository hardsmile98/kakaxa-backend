import { IsNumber, IsString } from 'class-validator';

export class GameDto {
  @IsNumber()
  id: number;

  @IsString()
  hash: string;

  @IsNumber()
  score: number;
}
