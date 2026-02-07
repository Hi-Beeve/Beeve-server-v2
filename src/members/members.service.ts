import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private prismaService: PrismaService) {}

  async findById(memberId: bigint) {
    const member = await this.prismaService.member.findUnique({
      where: { member_id: memberId },
      select: {
        member_id: true,
        email: true,
        name: true,
        phone_number: true,
        birth_date: true,
        gender: true,
        height: true,
        weight: true,
        bmi: true,
        profile_url: true,
        created_at: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async getProfile(memberId: bigint) {
    return this.findById(memberId);
  }
}
