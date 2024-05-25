import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

const {
  env: { TELEGRAM_TOKEN },
} = process;

export type TgUser = {
  id: bigint;
  first_name: string;
  last_name: string;
  username: string;
  language_code: string;
};

const transformInitData = (telegramInitData: string) => {
  const data = Object.fromEntries(new URLSearchParams(telegramInitData));

  return {
    ...data,
    user: JSON.parse(data.user),
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
      const data = transformInitData(telegramData);

      const isVerify = verifyTelegramWebAppData(telegramData);

      if (!isVerify) {
        throw new UnauthorizedException('User is unauthorized');
      }

      return data.user as TgUser;
    } catch (error) {
      throw new UnauthorizedException('User is unauthorized');
    }
  },
);
