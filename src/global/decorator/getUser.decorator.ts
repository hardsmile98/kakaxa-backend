import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

const {
  env: { TELEGRAM_TOKEN },
} = process;

export type TgUserData = {
  id: bigint;
  first_name: string;
  last_name: string;
  username: string;
  language_code: string;
};

export type TgUser = TgUserData & {
  refCode?: string;
};

type TgData = {
  query_id: string;
  user: string;
  auth_date: string;
  hash: string;
  start_param?: string;
};

const transformInitData = (telegramInitData: string) => {
  const data = Object.fromEntries(
    new URLSearchParams(telegramInitData),
  ) as TgData;

  const user = JSON.parse(data.user) as TgUserData;

  return {
    ...user,
    refCode: data.start_param,
  };
};

const verifyTelegramWebAppData = (telegramInitData: string): boolean => {
  const initData = new URLSearchParams(telegramInitData);
  const hashFromClient = initData.get('hash');
  const dataToCheck: string[] = [];

  initData.sort();
  initData.forEach((v, k) => k !== 'hash' && dataToCheck.push(`${k}=${v}`));

  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(TELEGRAM_TOKEN);

  const signature = crypto
    .createHmac('sha256', secret.digest())
    .update(dataToCheck.join('\n'));

  const referenceHash = signature.digest('hex');

  return hashFromClient === referenceHash;
};

export const GetUser = createParamDecorator(
  (_: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    const telegramData = request.headers['x-telegram-data'];

    if (!telegramData) {
      throw new UnauthorizedException('User is unauthorized');
    }

    try {
      const isVerify = verifyTelegramWebAppData(telegramData);

      if (!isVerify) {
        throw new UnauthorizedException('User is unauthorized');
      }

      const user = transformInitData(telegramData);

      return user;
    } catch (error) {
      throw new UnauthorizedException('User is unauthorized');
    }
  },
);
