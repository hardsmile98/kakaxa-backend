import { Controller, Get, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUser, TgUser } from 'src/global/decorator';
import { NftQuery } from './dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('/profile')
  getProfile(@GetUser() user: TgUser) {
    return this.usersService.getProfile(user);
  }

  @Get('/checkEnergy')
  checkEnergy(@GetUser() user: TgUser) {
    return this.usersService.checkEnergy(user);
  }

  @Get('/top')
  getLeadboard(@GetUser() user: TgUser) {
    return this.usersService.getLeadboard(user);
  }

  @Get('/nftBonus')
  getNftBonus(@GetUser() _user: TgUser, @Query() nftQuery: NftQuery) {
    return this.usersService.getNftBonus(nftQuery);
  }

  @Get('/referals')
  getReferals(@GetUser() user: TgUser) {
    return this.usersService.getReferals(user);
  }
}
