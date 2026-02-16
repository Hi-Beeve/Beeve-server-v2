import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MembersService } from './members.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';

@ApiTags('Members')
@Controller('member')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MembersController {
  constructor(private membersService: MembersService) {}

  @Get('profile')
  @ApiOperation({ summary: '프로필 조회' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  getProfile(@CurrentUser('sub') memberId: bigint) {
    return this.membersService.getProfile(memberId);
  }

  @Post('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '프로필 수정' })
  @ApiResponse({ status: 200, description: '프로필 수정 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  updateProfile(
    @CurrentUser('sub') memberId: bigint,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.membersService.updateProfile(memberId, dto);
  }
}
