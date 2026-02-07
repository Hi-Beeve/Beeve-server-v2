import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MembersService } from './members.service';
import { CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';

@ApiTags('Members')
@Controller('members')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MembersController {
  constructor(private membersService: MembersService) {}

  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  getProfile(@CurrentUser('sub') memberId: bigint) {
    return this.membersService.getProfile(memberId);
  }
}
