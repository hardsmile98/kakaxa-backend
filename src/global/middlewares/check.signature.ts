import * as CryptoJS from 'crypto-js';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { TgUserData } from '../decorator';

const {
  env: { SIGNATURE_SECRET },
} = process;

const prisma = new PrismaClient();

const MAX_DIFF_MILLISECONDS = 1_000 * 60;

export async function checkSignature(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  const tgData = req.headers['x-telegram-data'];

  if (!signature || !timestamp || !tgData) {
    return res.status(400).json({ message: 'Bad request' });
  }

  if (
    typeof signature !== 'string' ||
    typeof timestamp !== 'string' ||
    typeof tgData !== 'string'
  ) {
    return res.status(400).json({ message: 'Bad request' });
  }

  const diff = Date.now() - +timestamp;

  if (diff > MAX_DIFF_MILLISECONDS) {
    return res.status(400).json({ message: 'Bad request' });
  }

  const message = `${tgData}:${timestamp}`;

  const hash = CryptoJS.HmacSHA256(message, SIGNATURE_SECRET).toString(
    CryptoJS.enc.Hex,
  );

  if (hash !== signature) {
    return res.status(400).json({ message: 'Bad request' });
  }

  try {
    const signatureFinded = await prisma.signature.findFirst({
      where: {
        hash: signature as string,
      },
    });

    if (signatureFinded) {
      return res.status(400).json({ message: 'Bad request' });
    }

    const data = Object.fromEntries(new URLSearchParams(tgData as string));

    const user = JSON.parse(data.user) as TgUserData;

    await prisma.signature.create({
      data: {
        hash: signature as string,
        userId: user.id,
      },
    });

    next();
  } catch (e) {
    console.log('Errir check signature: ', e.message);

    return res.status(400).json({ message: 'Bad request' });
  }
}
