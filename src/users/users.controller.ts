import { Controller, Get, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUser, TgUser } from 'src/global/decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('/profile')
  getProfile(@GetUser() user: TgUser, @Query() query: { refCode?: string }) {
    return this.usersService.getProfile(user, query.refCode);
  }

  @Get('/top')
  getLeadboard(@GetUser() user: TgUser) {
    return this.usersService.getLeadboard(user);
  }

  @Get('/referals')
  getReferals(@GetUser() user: TgUser) {
    return this.usersService.getReferals(user);
  }
}
