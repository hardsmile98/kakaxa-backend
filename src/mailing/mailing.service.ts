import { Injectable } from '@nestjs/common';
import { SendToBotDto } from './dto';
import { UsersService } from 'src/users/users.service';
import { lastValueFrom, map } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/global';

@Injectable()
export class MailingService {
  constructor(
    private readonly httpService: HttpService,
    private userService: UsersService,
    private configService: ConfigService<EnvironmentVariables>,
  ) {}

  urlBotApi = this.configService.get('URL_BOT_API');

  async sendToBot(dto: SendToBotDto) {
    try {
      let userIds: number[];

      if (dto.ids) {
        userIds = dto.ids;
      } else {
        userIds = await this.userService.getUserIds();
      }

      const { token, ...data } = dto;

      const result = await lastValueFrom(
        this.httpService
          .post<{
            success: boolean;
            messageall: string;
          }>(`${this.urlBotApi}/bot/telegram/send/${token}`, {
            ...data,
            ids: userIds,
          })
          .pipe(map((res) => res.data)),
      );

      return result;
    } catch (e) {
      return {
        success: false,
        message: 'job failed',
      };
    }
  }
}
