import { Body, Controller, Get, Post } from '@nestjs/common';
import { GetUser, TgUser } from 'src/global';
import { BoostsService } from './boosts.service';
import { BoostDto } from './dto';

@Controller('boosts')
export class BoostsController {
  constructor(private boostsService: BoostsService) {}

  @Get('/')
  getBoosts(@GetUser() user: TgUser) {
    return this.boostsService.getBoosts(user);
  }

  @Post('/apply')
  applyBoost(@GetUser() user: TgUser, @Body() boost: BoostDto) {
    return this.boostsService.applyBoost(user, boost);
  }

  @Post('/improve')
  improveBoost(@GetUser() user: TgUser, @Body() boost: BoostDto) {
    return this.boostsService.improveBoost(user, boost);
  }
}
