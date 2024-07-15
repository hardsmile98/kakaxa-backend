import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, map } from 'rxjs';

interface EnvironmentVariables {
  WORLD_NFT_COLLECTION_ADDRESS: string;
  BURN_NFT_COLLECTION_ADDRESS: string;
  SHITTY_KING_NFT_COLLECTION_ADDRESS: string;
  TONAPI_TOKEN: string;
}

@Injectable()
export class TonapiService {
  topapiToken = this.configService.get('TONAPI_TOKEN');

  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService<EnvironmentVariables>,
  ) {}

  worldCollectionAddress = this.configService.get(
    'WORLD_NFT_COLLECTION_ADDRESS',
  );

  burnCollectionAddress = this.configService.get('BURN_NFT_COLLECTION_ADDRESS');

  shittyKingCollectionAddress = this.configService.get(
    'SHITTY_KING_NFT_COLLECTION_ADDRESS',
  );

  async getNftByAddress(walletStateInit: string) {
    if (
      !this.worldCollectionAddress ||
      !this.burnCollectionAddress ||
      !this.shittyKingCollectionAddress
    ) {
      throw new BadRequestException('NFT collection address is empty');
    }

    let walletData: { public_key: string; address: string };

    try {
      walletData = await lastValueFrom(
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
    } catch (e) {
      console.log('Error get wallet info: ', e.message);

      return null;
    }

    if (!walletData) {
      return null;
    }

    let response: object[] = [];

    try {
      const data = await lastValueFrom(
        this.httpService
          .get<{ nft_items: Array<{ collection?: { address: string } }> }>(
            `https://tonapi.io/v2/accounts/${walletData.address}/nfts`,
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

      const filtered = data.nft_items.filter((el) =>
        [
          this.shittyKingCollectionAddress,
          this.burnCollectionAddress,
          this.worldCollectionAddress,
        ].includes(el.collection?.address),
      );

      response = filtered;
    } catch (e) {
      console.log(
        `Error get nft with address ${walletData.address}: `,
        e.message,
      );
    }

    return response;
  }
}
