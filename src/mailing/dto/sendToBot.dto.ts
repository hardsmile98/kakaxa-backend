import { IsObject, IsOptional, IsString } from 'class-validator';

export class SendToBotDto {
  @IsString()
  token: string;

  @IsString()
  action: string;

  @IsOptional()
  ids: number[];

  @IsObject()
  data: {
    photo?: string;
    caption?: string;
    message?: string;
    keyboard?: Array<unknown>;
  };
}
