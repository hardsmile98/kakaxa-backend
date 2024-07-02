import { IsOptional, IsString } from 'class-validator';

export class NftQuery {
  @IsString()
  @IsOptional()
  address: string;
}
