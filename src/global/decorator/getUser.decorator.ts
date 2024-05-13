import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

const {
  env: { TELEGRAM_TOKEN },
} = process;

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

    try {
      const data = transformInitData(telegramData);

      const isVerify = verifyTelegramWebAppData(telegramData);

      if (!isVerify) {
        throw new UnauthorizedException('User is unauthorized');
      }

      return data.user.id;
    } catch (error) {
      throw new UnauthorizedException('User is unauthorized');
    }
  },
);
