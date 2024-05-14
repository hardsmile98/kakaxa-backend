import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUser } from 'src/global/decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('/profile')
  getProfile(@GetUser() userId: number) {
    return this.usersService.getProfile(userId);
  }

  @Get('/top')
  getLeadboard() {
    return this.usersService.getLeadboard();
  }

  @Get('/referals')
  getReferals(@GetUser() userId: number) {
    return this.usersService.getReferals(userId);
  }
}
