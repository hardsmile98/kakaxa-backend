import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, map } from 'rxjs';

interface EnvironmentVariables {
  NFT_COLLECTION_ADDRESS: string;
  TONAPI_TOKEN: string;
}

@Injectable()
export class TonapiService {
  topapiToken = this.configService.get('TONAPI_TOKEN');

  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService<EnvironmentVariables>,
  ) {}

  async getNftByAddress(walletStateInit: string) {
    const collectionAddress = this.configService.get('NFT_COLLECTION_ADDRESS');

    if (!collectionAddress) {
      throw new BadRequestException('Не заполнен адресс nft коллекции');
    }

    try {
      const walletData = await lastValueFrom(
        this.httpService
          .post<{ public_key: string; address: string }>(
            `https://tonapi.io/v2/tonconnect/stateinit`,
            {
              state_init: walletStateInit,
            },
            {
              headers: {
                Authorization: this.topapiToken
                  ? `Bearer ${this.topapiToken}`
                  : undefined,
              },
            },
          )
          .pipe(map((res) => res.data)),
      );

      if (!walletData) {
        return null;
      }

      const data = await lastValueFrom(
        this.httpService
          .get<{ nft_items: Array<object> }>(
            `https://tonapi.io/v2/accounts/${walletData.address}/nfts`,
            {
              params: {
                collection: collectionAddress,
              },
              headers: {
                Authorization: this.topapiToken
                  ? `Bearer ${this.topapiToken}`
                  : undefined,
              },
            },
          )
          .pipe(map((res) => res.data)),
      );

      return data;
    } catch (_e) {
      return null;
    }
  }
}
