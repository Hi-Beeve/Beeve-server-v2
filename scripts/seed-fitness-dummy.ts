/**
 * beeve@gmail.com 더미 체력측정 데이터 생성 스크립트
 * 등급 상승형: 4 → 3 → 3 → 2 → 1
 *
 * 실행: npx ts-node scripts/seed-fitness-dummy.ts
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

function getAgeRange(age: number): { min: number; max: number } {
  const ranges = [
    { min: 19, max: 24 }, { min: 25, max: 29 }, { min: 30, max: 34 },
    { min: 35, max: 39 }, { min: 40, max: 44 }, { min: 45, max: 49 },
    { min: 50, max: 54 }, { min: 55, max: 59 }, { min: 60, max: 64 },
  ];
  return ranges.find((r) => age >= r.min && age <= r.max) ?? { min: 35, max: 39 };
}

function calcAge(birthDate: Date, measureDay: Date): number {
  let age = measureDay.getFullYear() - birthDate.getFullYear();
  const m = measureDay.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && measureDay.getDate() < birthDate.getDate())) age--;
  return age;
}

// 등급별 측정값 (male, 35~39 기준, 상승형)
const MONTHLY_DATA = [
  {
    month: '2월', date: '2026-02-12',
    STRENGTH:    { grade: 4, value: 8,     rawValue: 8,     program: 'STANDARD_PUSH_UP' },
    CARDIO:      { grade: 4, value: 35.0,  rawValue: 140,   program: 'VO2MAX' },
    ENDURANCE:   { grade: 4, value: 25,                     program: 'CROSS_CRUNCH' },
    FLEXIBILITY: { grade: 4, value: 2.5,                    program: 'SIT_AND_REACH' },
    AGILITY:     { grade: 4, value: 0.355,                  program: 'REACTION_TIME' },
    QUICKNESS:   { grade: 4, value: 0.530,                  program: 'FLIGHT_TIME' },
    rpe: 5, place: 'GYM',
  },
  {
    month: '3월', date: '2026-03-08',
    STRENGTH:    { grade: 3, value: 15,    rawValue: 15,    program: 'STANDARD_PUSH_UP' },
    CARDIO:      { grade: 3, value: 37.5,  rawValue: 132,   program: 'VO2MAX' },
    ENDURANCE:   { grade: 3, value: 35,                     program: 'CROSS_CRUNCH' },
    FLEXIBILITY: { grade: 3, value: 5.5,                    program: 'SIT_AND_REACH' },
    AGILITY:     { grade: 4, value: 0.345,                  program: 'REACTION_TIME' },
    QUICKNESS:   { grade: 4, value: 0.540,                  program: 'FLIGHT_TIME' },
    rpe: 4, place: 'GYM',
  },
  {
    month: '4월', date: '2026-04-19',
    STRENGTH:    { grade: 3, value: 28,    rawValue: 28,    program: 'STANDARD_PUSH_UP' },
    CARDIO:      { grade: 3, value: 38.5,  rawValue: 128,   program: 'VO2MAX' },
    ENDURANCE:   { grade: 3, value: 38,                     program: 'CROSS_CRUNCH' },
    FLEXIBILITY: { grade: 3, value: 7.0,                    program: 'SIT_AND_REACH' },
    AGILITY:     { grade: 4, value: 0.342,                  program: 'REACTION_TIME' },
    QUICKNESS:   { grade: 4, value: 0.547,                  program: 'FLIGHT_TIME' },
    rpe: 4, place: 'GYM',
  },
  {
    month: '5월', date: '2026-05-14',
    STRENGTH:    { grade: 2, value: 45,    rawValue: 45,    program: 'STANDARD_PUSH_UP' },
    CARDIO:      { grade: 2, value: 40.0,  rawValue: 120,   program: 'VO2MAX' },
    ENDURANCE:   { grade: 2, value: 40,                     program: 'CROSS_CRUNCH' },
    FLEXIBILITY: { grade: 2, value: 10.5,                   program: 'SIT_AND_REACH' },
    AGILITY:     { grade: 2, value: 0.335,                  program: 'REACTION_TIME' },
    QUICKNESS:   { grade: 4, value: 0.548,                  program: 'FLIGHT_TIME' },
    rpe: 3, place: 'GYM',
  },
  {
    month: '6월', date: '2026-06-03',
    STRENGTH:    { grade: 1, value: 55,    rawValue: 55,    program: 'STANDARD_PUSH_UP' },
    CARDIO:      { grade: 1, value: 42.0,  rawValue: 115,   program: 'VO2MAX' },
    ENDURANCE:   { grade: 1, value: 46,                     program: 'CROSS_CRUNCH' },
    FLEXIBILITY: { grade: 1, value: 15.0,                   program: 'SIT_AND_REACH' },
    AGILITY:     { grade: 1, value: 0.308,                  program: 'REACTION_TIME' },
    QUICKNESS:   { grade: 2, value: 0.560,                  program: 'FLIGHT_TIME' },
    rpe: 2, place: 'GYM',
  },
];

async function main() {
  const member = await prisma.member.findFirst({
    where: { email: 'beeve@gmail.com', deleted_yn: 'N' },
  });

  if (!member) {
    console.error('beeve@gmail.com 계정을 찾을 수 없습니다.');
    process.exit(1);
  }

  console.log(`✅ 계정 확인: member_id=${member.member_id}, gender=${member.gender}, birth_date=${member.birth_date}`);

  const heightInMeters = Number(member.height ?? 175) / 100;
  const weight = Number(member.weight ?? 70);
  const bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(2));

  for (const d of MONTHLY_DATA) {
    const measureDay = new Date(d.date);
    const age = member.birth_date ? calcAge(new Date(member.birth_date), measureDay) : 36;
    const ageRange = getAgeRange(age);

    const fitnessResult = {
      STRENGTH:    d.STRENGTH,
      CARDIO:      d.CARDIO,
      ENDURANCE:   d.ENDURANCE,
      FLEXIBILITY: d.FLEXIBILITY,
      AGILITY:     d.AGILITY,
      QUICKNESS:   d.QUICKNESS,
    };

    const grades = Object.values(fitnessResult).map((f: any) => f.grade);
    const totalGrade = Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);

    await prisma.fitness_measure.upsert({
      where: {
        member_id_measure_day: {
          member_id: member.member_id,
          measure_day: measureDay,
        },
      },
      update: { fitness_result: fitnessResult as any },
      create: {
        member_id:      member.member_id,
        age,
        age_range:      ageRange,
        measure_day:    measureDay,
        gender:         member.gender,
        height:         member.height ?? 175,
        weight:         member.weight ?? 70,
        bmi,
        rpe:            d.rpe,
        measure_place:  d.place,
        fitness_result: fitnessResult as any,
        deleted_yn:     'N',
      },
    });

    console.log(`  ${d.month} (${d.date}) → 종합 ${totalGrade}등급 저장 완료`);
  }

  console.log('\n🎉 더미 데이터 생성 완료!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
