import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  SendCodeDto,
  VerifyCodeDto,
  SignupDto,
  LoginDto,
  EmailLoginDto,
  RefreshTokenDto,
  LogoutDto,
} from './dto';
import { Public, CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 휴대폰 인증번호 발송
   */
  @Post('phone/send-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '휴대폰 인증번호 발송' })
  @ApiResponse({
    status: 200,
    description: '인증번호 발송 성공',
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  sendCode(@Body() dto: SendCodeDto) {
    return this.authService.sendVerificationCode(dto);
  }

  /**
   * 휴대폰 인증번호 확인
   */
  @Post('phone/verify-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '휴대폰 인증번호 확인' })
  @ApiResponse({
    status: 200,
    description: '인증 성공',
  })
  @ApiResponse({ status: 400, description: '인증 실패' })
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto);
  }

  /**
   * 회원가입
   */
  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({
    status: 200,
    description: '회원가입 성공',
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 409, description: '이미 가입된 사용자' })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  /**
   * 로그인
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
  })
  @ApiResponse({ status: 401, description: '가입되지 않은 사용자' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * 이메일/비밀번호 로그인 (심사용)
   */
  @Post('email-login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '이메일/비밀번호 로그인 (앱 심사용)' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '이메일 또는 비밀번호 불일치' })
  emailLogin(@Body() dto: EmailLoginDto) {
    return this.authService.loginWithEmail(dto);
  }

  /**
   * Access Token 재발급
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access Token 재발급' })
  @ApiResponse({
    status: 200,
    description: '토큰 재발급 성공',
  })
  @ApiResponse({ status: 401, description: '유효하지 않은 리프레시 토큰' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * 로그아웃
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공',
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  logout(
    @CurrentUser('sub') memberId: bigint,
    @Body() dto: LogoutDto,
  ) {
    return this.authService.logout(memberId, dto.refreshToken);
  }
}
