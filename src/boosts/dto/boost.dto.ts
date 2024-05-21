import { IsNumber } from 'class-validator';

export class BoostDto {
  @IsNumber()
  boostId: number;
}
