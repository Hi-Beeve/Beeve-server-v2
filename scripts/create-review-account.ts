/**
 * 앱 심사용 계정 생성 스크립트
 *
 * 실행 방법:
 *   npx ts-node scripts/create-review-account.ts
 *
 * 실행 전 환경변수 확인:
 *   REVIEW_TEST_EMAIL, REVIEW_TEST_PASSWORD, REVIEW_TEST_PHONE
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.REVIEW_TEST_EMAIL;
  const password = process.env.REVIEW_TEST_PASSWORD;
  const phoneNumber = process.env.REVIEW_TEST_PHONE;

  if (!email || !password || !phoneNumber) {
    throw new Error(
      'REVIEW_TEST_EMAIL, REVIEW_TEST_PASSWORD, REVIEW_TEST_PHONE 환경변수를 설정해주세요.',
    );
  }

  // 이미 존재하는지 확인
  const existing = await prisma.member.findFirst({
    where: { email, deleted_yn: 'N' },
  });

  if (existing) {
    console.log(`이미 존재하는 심사용 계정입니다. (member_id: ${existing.member_id})`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const member = await prisma.member.create({
    data: {
      email,
      password: hashedPassword,
      name: '테스트유저',
      birth_date: new Date('1990-01-01'),
      gender: 'M',
      height: 175.0,
      weight: 70.0,
      bmi: 22.86,
      phone_number: phoneNumber,
      deleted_yn: 'N',
    },
  });

  console.log(`심사용 계정 생성 완료`);
  console.log(`  member_id : ${member.member_id}`);
  console.log(`  email     : ${member.email}`);
  console.log(`  phone     : ${member.phone_number}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
