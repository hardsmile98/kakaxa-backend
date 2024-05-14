import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  async getProfile(userId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { userId: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User is unauthorized');
    }

    if (user.isShowHint) {
      await this.prismaService.user.update({
        where: { userId: user.userId },
        data: { isShowHint: false },
      });
    }

    return {
      success: true,
      user,
    };
  }

  async getLeadboard() {
    const top100 = await this.prismaService.user.findMany({
      take: 100,
      orderBy: [{ leadboardScore: 'desc' }],
      select: {
        userId: true,
        leadboardScore: true,
        name: true,
        username: true,
      },
    });

    return top100;
  }

  async getReferals(userId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { userId: userId },
    });

    const referals = await this.prismaService.user.findMany({
      where: {
        refCode: user.inviteCode,
      },
      select: {
        userId: true,
        name: true,
        username: true,
      },
    });

    return referals;
  }
}
