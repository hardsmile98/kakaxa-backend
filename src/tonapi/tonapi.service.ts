import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, map } from 'rxjs';

interface EnvironmentVariables {
  NFT_COLLECTION_ADDRESS: string;
  TONAPI_TOKEN: string;
}

@Injectable()
export class TonapiService {
  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService<EnvironmentVariables>,
  ) {}

  async getNftByAddress(address: string) {
    const collectionAddress = this.configService.get('NFT_COLLECTION_ADDRESS');
    const topapiToken = this.configService.get('TONAPI_TOKEN');

    try {
      const data = await lastValueFrom(
        this.httpService
          .get<{ nft_items: Array<object> }>(
            `https://tonapi.io/v2/accounts/${address}/nfts`,
            {
              params: {
                collection: collectionAddress,
              },
              headers: {
                Authorization: topapiToken
                  ? `Bearer ${topapiToken}`
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
