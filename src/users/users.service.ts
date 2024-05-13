import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  async getProfile(userId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { userId: userId },
    });

    if (!user) {
      const newUser = await this.createProfile(userId);

      return {
        success: true,
        user: newUser,
      };
    }

    return {
      success: true,
      user,
    };
  }

  async createProfile(userId: number) {
    const createdUser = await this.prismaService.user.create({
      data: {
        userId,
      },
    });

    return createdUser;
  }
}
