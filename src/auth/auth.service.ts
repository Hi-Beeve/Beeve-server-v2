import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PhoneVerificationService } from './phone-verification.service';
import { SmsService } from '../sms/sms.service';
import {
  SendCodeDto,
  VerifyCodeDto,
  SignupDto,
  LoginDto,
} from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly phoneVerificationService: PhoneVerificationService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * 휴대폰 인증번호 발송
   */
  async sendVerificationCode(dto: SendCodeDto) {
    const { phoneNumber } = dto;

    // 전화번호 유효성 검증
    if (!this.phoneVerificationService.validatePhoneNumber(phoneNumber)) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH201',
        message: '유효하지 않은 전화번호 형식입니다.',
      });
    }

    // 1분 제한 체크
    const canSend =
      await this.phoneVerificationService.checkRateLimit(phoneNumber);
    if (!canSend) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH202',
        message: '1분 후에 다시 시도해주세요.',
      });
    }

    // 일일 발송 한도 체크
    const withinDailyLimit =
      await this.phoneVerificationService.checkDailyLimit(phoneNumber);
    if (!withinDailyLimit) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH203',
        message: '일일 인증번호 발송 한도를 초과했습니다.',
      });
    }

    // 인증번호 생성
    const code = this.phoneVerificationService.generateCode();

    // SMS 발송
    const smsSent = await this.smsService.sendVerificationCode(phoneNumber, code);
    if (!smsSent) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH204',
        message: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
      });
    }

    // Redis에 저장
    await this.phoneVerificationService.saveVerificationCode(phoneNumber, code);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분 후

    return {
      isSuccess: true,
      message: '인증번호가 발송되었습니다.',
      data: {
        expiresAt: expiresAt.toISOString(),
        remainingAttempts: 5,
      },
    };
  }

  /**
   * 휴대폰 인증번호 확인
   */
  async verifyCode(dto: VerifyCodeDto) {
    const { phoneNumber, code } = dto;
    this.logger.log(`verifyCode called: ${phoneNumber}, ${code}`);

    try {
      // Redis에서 인증 정보 조회
      this.logger.log('Fetching verification data...');
      const verificationData =
        await this.phoneVerificationService.getVerificationCode(phoneNumber);
      this.logger.log(`Verification data: ${JSON.stringify(verificationData)}`);

      if (!verificationData) {
        throw new BadRequestException({
          isSuccess: false,
          code: 'AUTH208',
          message: '인증번호 발송 내역이 없습니다.',
        });
      }

      // 시도 횟수 체크 (5회 제한)
      if (verificationData.attempts >= 5) {
        await this.phoneVerificationService.deleteVerificationCode(phoneNumber);
        throw new BadRequestException({
          isSuccess: false,
          code: 'AUTH207',
          message: '인증 시도 횟수를 초과했습니다. 새로운 인증번호를 요청해주세요.',
        });
      }

      // 인증번호 불일치
      if (verificationData.code !== code) {
        const attempts =
          await this.phoneVerificationService.incrementAttempts(phoneNumber);
        throw new BadRequestException({
          isSuccess: false,
          code: 'AUTH205',
          message: '인증번호가 일치하지 않습니다.',
          data: {
            remainingAttempts: 5 - attempts,
          },
        });
      }

      // 인증 성공 - Verification Token 생성
      this.logger.log('Generating verification token...');
      const verificationToken =
        this.phoneVerificationService.generateVerificationToken(phoneNumber);

      // 인증번호 삭제
      await this.phoneVerificationService.deleteVerificationCode(phoneNumber);

      return {
        isSuccess: true,
          message: '인증되었습니다.',
        data: {
          verificationToken,
          phoneNumber,
        },
      };
    } catch (error) {
      this.logger.error(`verifyCode error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 회원가입
   */
  async signup(dto: SignupDto) {
    const {
      provider,
      providerUserId,
      phoneNumber,
      verificationToken,
      email,
      name,
      gender,
      birthDate,
      height,
      weight,
      profileUrl,
    } = dto;

    // Verification Token 검증
    const isValidToken = this.phoneVerificationService.verifyToken(
      phoneNumber,
      verificationToken,
    );

    if (!isValidToken) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH210',
        message: '인증 토큰이 만료되었습니다. 휴대폰 인증을 다시 진행해주세요.',
      });
    }

    // 이미 가입된 사용자 확인 (provider + providerUserId)
    const existingUser = await this.prisma.social_auth.findFirst({
      where: {
        provider,
        provider_user_id: providerUserId,
        deleted_yn: 'N',
      },
      include: {
        member: true,
      },
    });

    if (existingUser) {
      throw new ConflictException({
        isSuccess: false,
        code: 'AUTH101',
        message: '이미 가입된 사용자입니다.',
      });
    }

    // 이미 가입된 전화번호 확인
    const existingPhone = await this.prisma.member.findFirst({
      where: {
        phone_number: phoneNumber,
        deleted_yn: 'N',
      },
    });

    if (existingPhone) {
      throw new ConflictException({
        isSuccess: false,
        code: 'AUTH212',
        message: '이미 가입된 전화번호입니다.',
      });
    }

    // BMI 계산
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    // 회원 생성
    const member = await this.prisma.member.create({
      data: {
        email,
        name,
        gender,
        birth_date: new Date(birthDate),
        height,
        weight,
        bmi: parseFloat(bmi.toFixed(2)),
        profile_url: profileUrl,
        phone_number: phoneNumber,
        social_auth: {
          create: {
            provider,
            provider_user_id: providerUserId,
          },
        },
      },
    });

    // 토큰 생성
    const tokens = await this.generateTokens(member.member_id);

    // Refresh Token 저장
    await this.saveRefreshToken(member.member_id, tokens.refreshToken);

    return {
      isSuccess: true,
      data: {
        accessToken: tokens.accessToken,
        tokenType: 'Bearer',
        refreshToken: tokens.refreshToken,
        expiresIn: this.getExpiresInSeconds('JWT_ACCESS_EXPIRATION'),
        scope: 'read write',
        refreshTokenExpiresIn: this.getExpiresInSeconds('JWT_REFRESH_EXPIRATION'),
        name: member.name,
        profileUrl: member.profile_url,
      },
    };
  }

  /**
   * 로그인
   */
  async login(dto: LoginDto) {
    const { provider, providerUserId } = dto;

    // 소셜 인증 정보로 사용자 조회
    const socialAuth = await this.prisma.social_auth.findFirst({
      where: {
        provider,
        provider_user_id: providerUserId,
        deleted_yn: 'N',
      },
      include: {
        member: true,
      },
    });

    if (!socialAuth || socialAuth.member.deleted_yn === 'Y') {
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH101',
        message: '가입되지 않은 사용자입니다.',
      });
    }

    const member = socialAuth.member;

    // 토큰 생성
    const tokens = await this.generateTokens(member.member_id);

    // Refresh Token 저장 (기존 것 덮어쓰기)
    await this.saveRefreshToken(member.member_id, tokens.refreshToken);

    return {
      isSuccess: true,
      data: {
        accessToken: tokens.accessToken,
        tokenType: 'Bearer',
        refreshToken: tokens.refreshToken,
        expiresIn: this.getExpiresInSeconds('JWT_ACCESS_EXPIRATION'),
        scope: 'read write',
        refreshTokenExpiresIn: this.getExpiresInSeconds('JWT_REFRESH_EXPIRATION'),
        name: member.name,
        profileUrl: member.profile_url,
      },
    };
  }

  /**
   * 토큰 재발급
   */
  async refresh(refreshToken: string) {
    // Bearer 제거
    const token = refreshToken.replace('Bearer ', '');

    // 토큰 검증
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        isSuccess: false,
        code: 'AUTH105',
        message: '리프레시 토큰이 만료되었습니다.',
      });
    }

    // DB에서 Refresh Token 조회
    const storedToken = await this.prisma.refresh_token.findFirst({
      where: {
        member_id: payload.sub,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException({
        isSuccess: false,
        code: 'AUTH103',
        message: '리프레시 토큰이 존재하지 않습니다.',
      });
    }

    if (storedToken.token !== token) {
      throw new UnauthorizedException({
        isSuccess: false,
        code: 'AUTH104',
        message: '리프레시 토큰이 일치하지 않습니다.',
      });
    }

    // 새 Access Token 생성
    const accessToken = this.jwtService.sign(
      { sub: payload.sub },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '1h',
      },
    );

    return {
      isSuccess: true,
      data: {
        accessToken: `Bearer ${accessToken}`,
      },
    };
  }

  /**
   * 로그아웃
   */
  async logout(memberId: bigint, refreshToken: string) {
    const token = refreshToken.replace('Bearer ', '');

    // DB에서 Refresh Token 조회
    const storedToken = await this.prisma.refresh_token.findFirst({
      where: {
        member_id: memberId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException({
        isSuccess: false,
        code: 'AUTH103',
        message: '리프레시 토큰이 존재하지 않습니다.',
      });
    }

    if (storedToken.token !== token) {
      throw new UnauthorizedException({
        isSuccess: false,
        code: 'AUTH104',
        message: '리프레시 토큰이 일치하지 않습니다.',
      });
    }

    // Refresh Token 삭제
    await this.prisma.refresh_token.delete({
      where: {
        refresh_token_id: storedToken.refresh_token_id,
      },
    });

    return {
      isSuccess: true,
    };
  }

  /**
   * 토큰 생성 (Access + Refresh)
   */
  private async generateTokens(memberId: bigint) {
    // BigInt는 JSON.stringify로 직렬화할 수 없으므로 string으로 변환
    const payload = { sub: memberId.toString() };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
    });

    return {
      accessToken: `Bearer ${accessToken}`,
      refreshToken: `Bearer ${refreshToken}`,
    };
  }

  /**
   * Refresh Token 저장
   */
  private async saveRefreshToken(memberId: bigint, refreshToken: string) {
    const token = refreshToken.replace('Bearer ', '');

    // 기존 토큰 삭제
    await this.prisma.refresh_token.deleteMany({
      where: { member_id: memberId },
    });

    // 새 토큰 저장
    await this.prisma.refresh_token.create({
      data: {
        member_id: memberId,
        token,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  /**
   * JWT 만료 시간을 초 단위로 변환
   */
  private getExpiresInSeconds(configKey: string): number {
    const expiration = this.configService.get<string>(configKey) || '15m';
    const match = expiration.match(/^(\d+)([smhd])$/);

    if (!match) return 900; // 기본값 15분

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }
}
