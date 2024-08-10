const settings = {
  MAX_ENERGY: 3,
  BONUS_FOR_INVITE: 25,
  BONUS_FOR_INVITE_WITH_PREMIUM: 50,
  ENERGY_RECOVERY_TIME_SECONDS: 60 * 60 * 1.5,
  MAX_DIFF_SECONDS: 180,
  MAX_SCORE_IN_GAME: 150,
};

interface EnvironmentVariables {
  URL_CLIENT: string;
  DATABASE_URL: string;
  TELEGRAM_TOKEN: string;
  SIGNATURE_SECRET: string;
  URL_BOT_API: string;
  WORLD_NFT_COLLECTION_ADDRESS: string;
  BURN_NFT_COLLECTION_ADDRESS: string;
  SHITTY_KING_NFT_COLLECTION_ADDRESS: string;
  TONAPI_TOKEN: string;
}

export { settings };

export type { EnvironmentVariables };
