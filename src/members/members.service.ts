import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private prismaService: PrismaService) {}

  async findById(id: string) {
    const member = await this.prismaService.member.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        phone: true,
        birthDate: true,
        gender: true,
        profileImage: true,
        createdAt: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async getProfile(userId: string) {
    return this.findById(userId);
  }
}
