import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
    const member = await this.prismaService.member.findUnique({
      where: { member_id: memberId },
      select: {
        name: true,
        birth_date: true,
        gender: true,
        height: true,
        weight: true,
        bmi: true,
        profile_url: true,
      },
    });

    if (!member) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return {
      isSuccess: true,
      code: 'MEMBER200',
      data: {
        name: member.name,
        birthDate: member.birth_date
          ? member.birth_date.toISOString().split('T')[0]
          : null,
        gender: member.gender,
        height: member.height ? Number(member.height) : null,
        weight: member.weight ? Number(member.weight) : null,
        bmi: member.bmi ? Number(member.bmi) : null,
        profileUrl: member.profile_url,
      },
    };
  }

  async updateProfile(memberId: bigint, dto: UpdateProfileDto) {
    const member = await this.prismaService.member.findUnique({
      where: { member_id: memberId },
    });

    if (!member) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const heightInMeters = dto.height / 100;
    const bmi = parseFloat(
      (dto.weight / (heightInMeters * heightInMeters)).toFixed(2),
    );

    const updated = await this.prismaService.member.update({
      where: { member_id: memberId },
      data: {
        name: dto.name,
        birth_date: new Date(dto.birthDate),
        gender: dto.gender,
        height: dto.height,
        weight: dto.weight,
        bmi,
        profile_url: dto.profileUrl ?? member.profile_url,
        updated_at: new Date(),
      },
    });

    return {
      isSuccess: true,
      code: 'MEMBER200',
      data: {
        name: updated.name,
        profileUrl: updated.profile_url,
      },
    };
  }
}
