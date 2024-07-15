import { Injectable, NestMiddleware } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';
import { Request, Response, NextFunction } from 'express';

const {
  env: { SIGNATURE_SECRET },
} = process;

@Injectable()
export class CheckSignature implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    const tgData = req.headers['x-telegram-data'];

    if (!signature || !timestamp || !tgData) {
      return res.status(400).json({ message: 'Bad request' });
    }

    const message = `${tgData}:${timestamp}`;

    const hash = CryptoJS.HmacSHA256(message, SIGNATURE_SECRET).toString(
      CryptoJS.enc.Hex,
    );

    if (hash !== signature) {
      return res.status(400).json({ message: 'Bad request' });
    }

    next();
  }
}
