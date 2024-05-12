import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  async getProfile() {
    return {
      id: 1,
    };
  }

  async createProfile({ userId }: { userId: number }) {
    const createdUser = await this.prismaService.user.create({
      data: {
        userId,
      },
    });

    return createdUser;
  }
}
