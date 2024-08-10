import { IsObject, IsString } from 'class-validator';

export class SendToBotDto {
  @IsString()
  token: string;

  @IsString()
  action: string;

  @IsObject()
  data: {
    photo?: string;
    caption?: string;
    message?: string;
    keyboard?: Array<unknown>;
  };
}
