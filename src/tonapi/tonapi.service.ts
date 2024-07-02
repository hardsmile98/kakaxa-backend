import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class TonapiService {
  constructor(private readonly httpService: HttpService) {}

  async getNftByAddress(address: string) {
    try {
      const data = await lastValueFrom(
        this.httpService
          .get<{ nft_items: Array<object> }>(
            `https://tonapi.io/v2/accounts/${address}/nfts`,
          )
          .pipe(map((res) => res.data)),
      );

      return data;
    } catch (_e) {
      return null;
    }
  }
}
