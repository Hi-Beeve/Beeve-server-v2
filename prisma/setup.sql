-- ============================================
-- BEEVE 완전한 DB 셋업 스크립트
-- Prisma schema.prisma 기준
-- ============================================

-- ============================================
-- 1. DDL (테이블 생성)
-- ============================================

-- member 테이블
CREATE TABLE member (
  member_id       BIGSERIAL PRIMARY KEY,
  email           VARCHAR(255) NOT NULL,
  password        VARCHAR(255),
  name            VARCHAR(50),
  birth_date      DATE,
  gender          VARCHAR(1) NOT NULL DEFAULT 'M',
  height          DECIMAL,
  weight          DECIMAL,
  bmi             DECIMAL,
  profile_url     TEXT,
  phone_number    VARCHAR(20) UNIQUE,
  withdraw_reason VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_yn      VARCHAR(1) NOT NULL DEFAULT 'N'
);

-- refresh_token 테이블
CREATE TABLE refresh_token (
  refresh_token_id BIGSERIAL PRIMARY KEY,
  member_id        BIGINT NOT NULL,
  token            TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL,
  CONSTRAINT refresh_token_member_id_fkey FOREIGN KEY (member_id) REFERENCES member(member_id)
);

-- social_auth 테이블
CREATE TABLE social_auth (
  social_auth_id   BIGSERIAL PRIMARY KEY,
  member_id        BIGINT NOT NULL,
  provider         VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  consent_scope    VARCHAR(255),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  deleted_yn       VARCHAR(1) DEFAULT 'N',
  CONSTRAINT social_auth_member_id_fkey FOREIGN KEY (member_id) REFERENCES member(member_id)
);

-- user_exercise_information 테이블 (구 exercise_information)
CREATE TABLE user_exercise_information (
  exercise_info_id BIGSERIAL,
  member_id        BIGINT NOT NULL,
  goal             VARCHAR(200) NOT NULL,
  place            VARCHAR(50) NOT NULL,
  equipment        VARCHAR(100),
  disease          VARCHAR(20),
  injury           VARCHAR(20),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  deleted_yn       VARCHAR(1) DEFAULT 'N',
  CONSTRAINT exercise_information_pkey PRIMARY KEY (exercise_info_id),
  CONSTRAINT exercise_information_member_id_fkey FOREIGN KEY (member_id) REFERENCES member(member_id)
);

-- exercise_program 테이블
CREATE TABLE exercise_program (
  exercise_id   BIGSERIAL PRIMARY KEY,
  exercise_name VARCHAR(200),
  exercise_step VARCHAR(20),
  equipment     VARCHAR(100),
  caution       VARCHAR(500),
  fitness_type  VARCHAR(100),
  purpose       VARCHAR(100)
);

-- daily_recommendation 테이블 (구 recommend_exercise_schedule의 헤더)
CREATE TABLE daily_recommendation (
  recommendation_id   BIGSERIAL PRIMARY KEY,
  member_id           BIGINT NOT NULL,
  total_duration      SMALLINT,
  rpe                 SMALLINT,
  recommendation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_fitness_type VARCHAR(100),
  ai_prompt           TEXT,
  ai_response         TEXT,
  status              VARCHAR(50),
  deleted_yn          VARCHAR(1),
  CONSTRAINT recommend_schedule_member_id_fkey FOREIGN KEY (member_id) REFERENCES member(member_id),
  CONSTRAINT uq_member_recommendation_date UNIQUE (member_id, recommendation_date)
);

-- daily_recommendation_exercise 테이블 (구 recommend_exercise_schedule의 운동 상세)
CREATE TABLE daily_recommendation_exercise (
  recommendation_exercise_id BIGSERIAL PRIMARY KEY,
  recommendation_id          BIGINT NOT NULL,
  exercise_name              VARCHAR(200) NOT NULL,
  reps                       SMALLINT,
  sets                       SMALLINT,
  rest_seconds               SMALLINT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ DEFAULT now(),
  exercise_id                BIGINT NOT NULL,
  duration                   SMALLINT,
  CONSTRAINT daily_recommendation_exercise_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES daily_recommendation(recommendation_id),
  CONSTRAINT recommend_schedule_detail_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercise_program(exercise_id)
);

-- fitness_measure 테이블
CREATE TABLE fitness_measure (
  measure_id    BIGSERIAL PRIMARY KEY,
  member_id     BIGINT,
  age           SMALLINT NOT NULL,
  age_range     JSONB NOT NULL,
  measure_day   DATE NOT NULL,
  gender        VARCHAR(1) NOT NULL,
  height        DECIMAL,
  weight        DECIMAL,
  bmi           DECIMAL,
  fitness_result JSONB,
  rpe           SMALLINT,
  measure_place VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT now(),
  deleted_yn    VARCHAR(1) DEFAULT 'N',
  CONSTRAINT fitness_measure_member_id_fkey FOREIGN KEY (member_id) REFERENCES member(member_id),
  CONSTRAINT uq_member_measure_day UNIQUE (member_id, measure_day)
);

CREATE INDEX idx_fitness_measure_day ON fitness_measure (measure_day);
CREATE INDEX idx_fitness_measure_member_day ON fitness_measure (member_id, measure_day);

-- recommendation_feedback 테이블
CREATE TABLE recommendation_feedback (
  feedback_id         BIGSERIAL PRIMARY KEY,
  recommendation_id   BIGINT NOT NULL,
  member_id           BIGINT,
  completed_at        TIMESTAMPTZ DEFAULT now(),
  difficulty_rating   SMALLINT,
  satisfaction_rating SMALLINT,
  actual_duration     SMALLINT,
  CONSTRAINT recommendation_feedback_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES daily_recommendation(recommendation_id),
  CONSTRAINT recommendation_feedback_member_id_fkey FOREIGN KEY (member_id) REFERENCES member(member_id)
);

-- fitness_percentile_standard 테이블 (구 rank_standard)
-- fitness 컬럼값: STRENGTH, CARDIO, ENDURANCE, FLEXIBILITY, AGILITY, QUICKNESS
-- AGILITY는 낮을수록 좋음 → percentile_rank는 반전 저장 (실제 백분위 = 100 - percentile_rank)
CREATE TABLE fitness_percentile_standard (
  fitness_percentile_standard_id BIGSERIAL PRIMARY KEY,
  gender          VARCHAR(1) NOT NULL,
  min_age         SMALLINT,
  max_age         SMALLINT,
  fitness         VARCHAR(100),
  percentile_rank SMALLINT,
  threshold_value DECIMAL
);


-- ============================================
-- 2. 더미 데이터 (INSERT)
-- ============================================

-- member 데이터 (10명 + 심사용 계정)
INSERT INTO member (email, name, birth_date, gender, height, weight, bmi, profile_url, deleted_yn) VALUES
('kim.seojun@example.com',   '김서준', '1995-03-12', 'M', 175.2, 72.5, 23.62, NULL, 'N'),
('lee.haerin@example.com',   '이해린', '1992-07-28', 'F', 162.4, 55.1, 20.89, NULL, 'N'),
('park.minjae@example.com',  '박민재', '1987-11-05', 'M', 180.1, 83.3, 25.68, NULL, 'N'),
('choi.suyeon@example.com',  '최수연', '2001-01-19', 'F', 168.0, 60.2, 21.33, NULL, 'N'),
('jung.doyun@example.com',   '정도윤', '1998-05-09', 'M', 178.8, 76.0, 23.77, NULL, 'N'),
('yoon.seulgi@example.com',  '윤슬기', '1990-09-23', 'F', 158.6, 49.8, 19.80, NULL, 'N'),
('seo.hyunwoo@example.com',  '서현우', '1985-02-14', 'M', 172.0, 69.0, 23.32, NULL, 'N'),
('han.jiwon@example.com',    '한지원', '1993-12-31', 'F', 165.3, 57.4, 21.01, NULL, 'N'),
('kwon.taeyang@example.com', '권태양', '1999-06-07', 'M', 182.4, 79.2, 23.81, NULL, 'N'),
('bae.yerim@example.com',    '배예림', '1996-04-03', 'F', 160.9, 52.0, 20.09, 'https://img.example.com/u/yerim.jpg', 'N');

-- 심사용 계정 (이메일/비밀번호 로그인)
INSERT INTO member (email, password, name, birth_date, gender, height, weight, bmi, deleted_yn) VALUES
('beeve.test@gmail.com', '$2b$10$WCg/UqGnR5h8AE4mBr/3ueTYp/5DqVNFrJ/0dqYKT0LTMxmyKXLWq', '테스트유저', '1990-01-01', 'M', 175.0, 70.0, 22.86, 'N');

-- social_auth 데이터
INSERT INTO social_auth (member_id, provider, provider_user_id, consent_scope, deleted_yn) VALUES
(1,  'KAKAO',  'kakao_10001',  'email,profile', 'N'),
(2,  'GOOGLE', 'google_20002', 'email,profile', 'N'),
(3,  'APPLE',  'apple_30003',  'email',         'N'),
(4,  'KAKAO',  'kakao_10004',  'email,profile', 'N'),
(5,  'GOOGLE', 'google_20005', 'email,profile', 'N'),
(6,  'APPLE',  'apple_30006',  'email',         'N'),
(7,  'KAKAO',  'kakao_10007',  'email,profile', 'N'),
(8,  'GOOGLE', 'google_20008', 'email,profile', 'N'),
(9,  'APPLE',  'apple_30009',  'email',         'N'),
(10, 'KAKAO',  'kakao_10010',  'email,profile', 'N');

-- user_exercise_information 데이터
INSERT INTO user_exercise_information (member_id, goal, place, equipment, disease, injury, deleted_yn) VALUES
(1,  'FAT_LOSS',               'HOME',    NULL,        NULL,    NULL,          'N'),
(2,  'FLEXIBILITY_IMPROVEMENT','GYM',     'DUMBBELL',  NULL,    '발목염좌',    'N'),
(3,  'FITNESS_IMPROVEMENT',    'OUTDOOR', NULL,        '고혈압', NULL,          'N'),
(4,  'HEALTH_RECOVERY',        'HOME',    NULL,        NULL,    NULL,          'N'),
(5,  'STRENGTH_GAIN',          'GYM',     'BARBELL',   NULL,    NULL,          'N'),
(6,  'HABIT_FORMATION',        'HOME',    NULL,        NULL,    '허리디스크',  'N'),
(7,  'COMPETITION_PREPARATION','OUTDOOR', NULL,        NULL,    NULL,          'N'),
(8,  'FLEXIBILITY_IMPROVEMENT','HOME',    'YOGA_MAT',  NULL,    NULL,          'N'),
(9,  'MUSCLE_MASS_GAIN',       'GYM',     'MACHINE',   NULL,    '어깨충돌증후군','N'),
(10, 'STRESS_RELIEF',          'HOME',    NULL,        NULL,    NULL,          'N');

-- exercise_program 데이터
INSERT INTO exercise_program (exercise_name, exercise_step, equipment, caution, fitness_type, purpose) VALUES
('스쿼트',              'BEGINNER',     'NONE',        '무릎이 발끝을 넘지 않도록 주의',   'STRENGTH',    'MUSCLE_MASS_GAIN'),
('푸시업',              'BEGINNER',     'NONE',        '허리가 처지지 않도록 코어 유지',   'STRENGTH',    'STRENGTH_GAIN'),
('플랭크',              'BEGINNER',     'NONE',        '허리를 일직선 유지',               'ENDURANCE',   'FAT_LOSS'),
('런지',                'BEGINNER',     'NONE',        '앞무릎이 90도를 유지',             'STRENGTH',    'FAT_LOSS'),
('데드버그',            'BEGINNER',     'NONE',        '허리가 바닥에서 뜨지 않도록 유지', 'ENDURANCE',   'HEALTH_RECOVERY'),
('조깅',                'BEGINNER',     'NONE',        '적절한 속도 유지, 무리하지 않기',  'CARDIO',      'FITNESS_IMPROVEMENT'),
('인터벌 러닝',         'INTERMEDIATE', 'NONE',        '심박수 관리 필요',                 'CARDIO',      'FITNESS_IMPROVEMENT'),
('벤치프레스(머신)',    'INTERMEDIATE', 'MACHINE',     '어깨 부상 주의',                   'STRENGTH',    'STRENGTH_GAIN'),
('레그프레스',          'BEGINNER',     'MACHINE',     '무릎이 발끝을 벗어나지 않도록',    'STRENGTH',    'MUSCLE_MASS_GAIN'),
('요가 스트레칭',       'BEGINNER',     'YOGA_MAT',    '무리하게 뻗지 않기',               'FLEXIBILITY', 'FLEXIBILITY_IMPROVEMENT'),
('좌전굴 스트레칭',     'BEGINNER',     'NONE',        '허리를 둥글게 말지 않기',          'FLEXIBILITY', 'FLEXIBILITY_IMPROVEMENT'),
('스텝박스 스텝업',     'BEGINNER',     'STEP_BOX',    '발 전체를 박스에 올리기',          'CARDIO',      'FAT_LOSS'),
('반응속도 드릴',       'INTERMEDIATE', 'NONE',        '부상 방지를 위해 준비운동 필수',   'AGILITY',     'FITNESS_IMPROVEMENT'),
('점프 스쿼트',         'INTERMEDIATE', 'NONE',        '착지 시 무릎 충격 최소화',         'QUICKNESS',   'FITNESS_IMPROVEMENT'),
('크로스 크런치',       'BEGINNER',     'NONE',        '목을 당기지 않고 복근으로만 수행', 'ENDURANCE',   'FAT_LOSS');

-- daily_recommendation 데이터 (일부 회원)
INSERT INTO daily_recommendation (member_id, total_duration, rpe, recommendation_date, target_fitness_type, status, deleted_yn) VALUES
(1, 45, 3, now() - INTERVAL '1 day', 'STRENGTH',    'COMPLETED', 'N'),
(2, 40, 2, now() - INTERVAL '1 day', 'FLEXIBILITY', 'COMPLETED', 'N'),
(3, 50, 4, now() - INTERVAL '1 day', 'CARDIO',      'COMPLETED', 'N'),
(4, 30, 2, now() - INTERVAL '1 day', 'ENDURANCE',   'PENDING',   'N'),
(5, 60, 5, now() - INTERVAL '1 day', 'STRENGTH',    'COMPLETED', 'N');

-- daily_recommendation_exercise 데이터
INSERT INTO daily_recommendation_exercise (recommendation_id, exercise_name, reps, sets, rest_seconds, exercise_id, duration) VALUES
(1, '스쿼트',           15, 3, 60, 1, NULL),
(1, '런지',             12, 3, 60, 4, NULL),
(2, '요가 스트레칭',    NULL, 1, 0, 10, 20),
(2, '좌전굴 스트레칭',  NULL, 3, 30, 11, NULL),
(3, '조깅',             NULL, 1, 0, 6, 30),
(3, '인터벌 러닝',      1, 6, 90, 7, NULL),
(4, '플랭크',           NULL, 3, 45, 3, 45),
(4, '데드버그',         12, 3, 45, 5, NULL),
(5, '벤치프레스(머신)', 10, 4, 90, 8, NULL),
(5, '레그프레스',       12, 4, 90, 9, NULL);

-- recommendation_feedback 데이터
INSERT INTO recommendation_feedback (recommendation_id, member_id, difficulty_rating, satisfaction_rating, actual_duration) VALUES
(1, 1, 3, 4, 50),
(2, 2, 2, 5, 45),
(3, 3, 4, 4, 55),
(5, 5, 5, 3, 65);


-- ============================================
-- 3. 백분위 기준표 (fitness_percentile_standard)
-- 국민체력100 공공데이터 기반
-- fitness: STRENGTH(푸시업), CARDIO(스텝검사VO2max), ENDURANCE(크로스크런치),
--          FLEXIBILITY(앉아윗몸앞으로굽히기), AGILITY(반응시간-낮을수록좋음), QUICKNESS(체공시간)
-- percentile_rank: 80 = 상위 20% (1등급), 60 = 상위 40% (2등급), 40 = 상위 60% (3등급)
-- AGILITY는 반전 저장: 실제 백분위 = 100 - percentile_rank
-- ============================================

-- STRENGTH (푸시업 횟수) - 남자
INSERT INTO fitness_percentile_standard (gender, min_age, max_age, fitness, percentile_rank, threshold_value) VALUES
('M', 19, 24, 'STRENGTH', 80, 55), ('M', 19, 24, 'STRENGTH', 60, 43), ('M', 19, 24, 'STRENGTH', 40, 12),
('M', 25, 29, 'STRENGTH', 80, 54), ('M', 25, 29, 'STRENGTH', 60, 42), ('M', 25, 29, 'STRENGTH', 40, 11),
('M', 30, 34, 'STRENGTH', 80, 55), ('M', 30, 34, 'STRENGTH', 60, 43), ('M', 30, 34, 'STRENGTH', 40, 12),
('M', 35, 39, 'STRENGTH', 80, 54), ('M', 35, 39, 'STRENGTH', 60, 42), ('M', 35, 39, 'STRENGTH', 40, 11),
('M', 40, 44, 'STRENGTH', 80, 55), ('M', 40, 44, 'STRENGTH', 60, 43), ('M', 40, 44, 'STRENGTH', 40, 12),
('M', 45, 49, 'STRENGTH', 80, 54), ('M', 45, 49, 'STRENGTH', 60, 42), ('M', 45, 49, 'STRENGTH', 40, 11),
('M', 50, 54, 'STRENGTH', 80, 52), ('M', 50, 54, 'STRENGTH', 60, 40), ('M', 50, 54, 'STRENGTH', 40, 10),
('M', 55, 59, 'STRENGTH', 80, 50), ('M', 55, 59, 'STRENGTH', 60, 38), ('M', 55, 59, 'STRENGTH', 40, 9),
('M', 60, 64, 'STRENGTH', 80, 47), ('M', 60, 64, 'STRENGTH', 60, 35), ('M', 60, 64, 'STRENGTH', 40, 8);

-- STRENGTH (푸시업 횟수) - 여자
INSERT INTO fitness_percentile_standard (gender, min_age, max_age, fitness, percentile_rank, threshold_value) VALUES
('F', 19, 24, 'STRENGTH', 80, 21), ('F', 19, 24, 'STRENGTH', 60, 17), ('F', 19, 24, 'STRENGTH', 40, 4),
('F', 25, 29, 'STRENGTH', 80, 21), ('F', 25, 29, 'STRENGTH', 60, 17), ('F', 25, 29, 'STRENGTH', 40, 4),
('F', 30, 34, 'STRENGTH', 80, 22), ('F', 30, 34, 'STRENGTH', 60, 18), ('F', 30, 34, 'STRENGTH', 40, 4),
('F', 35, 39, 'STRENGTH', 80, 20), ('F', 35, 39, 'STRENGTH', 60, 16), ('F', 35, 39, 'STRENGTH', 40, 4),
('F', 40, 44, 'STRENGTH', 80, 20), ('F', 40, 44, 'STRENGTH', 60, 16), ('F', 40, 44, 'STRENGTH', 40, 4),
('F', 45, 49, 'STRENGTH', 80, 20), ('F', 45, 49, 'STRENGTH', 60, 15), ('F', 45, 49, 'STRENGTH', 40, 4),
('F', 50, 54, 'STRENGTH', 80, 19), ('F', 50, 54, 'STRENGTH', 60, 15), ('F', 50, 54, 'STRENGTH', 40, 4),
('F', 55, 59, 'STRENGTH', 80, 18), ('F', 55, 59, 'STRENGTH', 60, 14), ('F', 55, 59, 'STRENGTH', 40, 4),
('F', 60, 64, 'STRENGTH', 80, 17), ('F', 60, 64, 'STRENGTH', 60, 13), ('F', 60, 64, 'STRENGTH', 40, 3);

-- CARDIO (스텝검사 VO2max) - 남자
INSERT INTO fitness_percentile_standard (gender, min_age, max_age, fitness, percentile_rank, threshold_value) VALUES
('M', 19, 24, 'CARDIO', 80, 47.6), ('M', 19, 24, 'CARDIO', 60, 44.8), ('M', 19, 24, 'CARDIO', 40, 42.0),
('M', 25, 29, 'CARDIO', 80, 44.8), ('M', 25, 29, 'CARDIO', 60, 42.2), ('M', 25, 29, 'CARDIO', 40, 39.6),
('M', 30, 34, 'CARDIO', 80, 42.9), ('M', 30, 34, 'CARDIO', 60, 40.6), ('M', 30, 34, 'CARDIO', 40, 38.2),
('M', 35, 39, 'CARDIO', 80, 41.8), ('M', 35, 39, 'CARDIO', 60, 39.5), ('M', 35, 39, 'CARDIO', 40, 37.2),
('M', 40, 44, 'CARDIO', 80, 40.9), ('M', 40, 44, 'CARDIO', 60, 38.8), ('M', 40, 44, 'CARDIO', 40, 36.6),
('M', 45, 49, 'CARDIO', 80, 40.1), ('M', 45, 49, 'CARDIO', 60, 38.1), ('M', 45, 49, 'CARDIO', 40, 36.0),
('M', 50, 54, 'CARDIO', 80, 38.8), ('M', 50, 54, 'CARDIO', 60, 36.9), ('M', 50, 54, 'CARDIO', 40, 35.0),
('M', 55, 59, 'CARDIO', 80, 37.7), ('M', 55, 59, 'CARDIO', 60, 35.9), ('M', 55, 59, 'CARDIO', 40, 34.1),
('M', 60, 64, 'CARDIO', 80, 36.3), ('M', 60, 64, 'CARDIO', 60, 34.8), ('M', 60, 64, 'CARDIO', 40, 33.2);

-- CARDIO (스텝검사 VO2max) - 여자
INSERT INTO fitness_percentile_standard (gender, min_age, max_age, fitness, percentile_rank, threshold_value) VALUES
('F', 19, 24, 'CARDIO', 80, 36.8), ('F', 19, 24, 'CARDIO', 60, 34.8), ('F', 19, 24, 'CARDIO', 40, 32.8),
('F', 25, 29, 'CARDIO', 80, 36.0), ('F', 25, 29, 'CARDIO', 60, 34.1), ('F', 25, 29, 'CARDIO', 40, 32.2),
('F', 30, 34, 'CARDIO', 80, 34.8), ('F', 30, 34, 'CARDIO', 60, 32.9), ('F', 30, 34, 'CARDIO', 40, 31.0),
('F', 35, 39, 'CARDIO', 80, 34.2), ('F', 35, 39, 'CARDIO', 60, 32.3), ('F', 35, 39, 'CARDIO', 40, 30.5),
('F', 40, 44, 'CARDIO', 80, 33.8), ('F', 40, 44, 'CARDIO', 60, 32.0), ('F', 40, 44, 'CARDIO', 40, 30.3),
('F', 45, 49, 'CARDIO', 80, 33.0), ('F', 45, 49, 'CARDIO', 60, 31.4), ('F', 45, 49, 'CARDIO', 40, 29.7),
('F', 50, 54, 'CARDIO', 80, 32.3), ('F', 50, 54, 'CARDIO', 60, 29.1), ('F', 50, 54, 'CARDIO', 40, 29.1),
('F', 55, 59, 'CARDIO', 80, 31.3), ('F', 55, 59, 'CARDIO', 60, 28.4), ('F', 55, 59, 'CARDIO', 40, 28.4),
('F', 60, 64, 'CARDIO', 80, 30.2), ('F', 60, 64, 'CARDIO', 60, 29.0), ('F', 60, 64, 'CARDIO', 40, 27.7);

-- ENDURANCE (크로스크런치 횟수) - 남자
INSERT INTO fitness_percentile_standard (gender, min_age, max_age, fitness, percentile_rank, threshold_value) VALUES
('M', 19, 24, 'ENDURANCE', 80, 55), ('M', 19, 24, 'ENDURANCE', 60, 48), ('M', 19, 24, 'ENDURANCE', 40, 42),
('M', 25, 29, 'ENDURANCE', 80, 51), ('M', 25, 29, 'ENDURANCE', 60, 45), ('M', 25, 29, 'ENDURANCE', 40, 38),
('M', 30, 34, 'ENDURANCE', 80, 47), ('M', 30, 34, 'ENDURANCE', 60, 41), ('M', 30, 34, 'ENDURANCE', 40, 35),
('M', 35, 39, 'ENDURANCE', 80, 45), ('M', 35, 39, 'ENDURANCE', 60, 39), ('M', 35, 39, 'ENDURANCE', 40, 33),
('M', 40, 44, 'ENDURANCE', 80, 44), ('M', 40, 44, 'ENDURANCE', 60, 38), ('M', 40, 44, 'ENDURANCE', 40, 32),
('M', 45, 49, 'ENDURANCE', 80, 41), ('M', 45, 49, 'ENDURANCE', 60, 36), ('M', 45, 49, 'ENDURANCE', 40, 30),
('M', 50, 54, 'ENDURANCE', 80, 38), ('M', 50, 54, 'ENDURANCE', 60, 32), ('M', 50, 54, 'ENDURANCE', 40, 26),
('M', 55, 59, 'ENDURANCE', 80, 35), ('M', 55, 59, 'ENDURANCE', 60, 29), ('M', 55, 59, 'ENDURANCE', 40, 23),
('M', 60, 64, 'ENDURANCE', 80, 31), ('M', 60, 64, 'ENDURANCE', 60, 25), ('M', 60, 64, 'ENDURANCE', 40, 19);

-- ENDURANCE (크로스크런치 횟수) - 여자
INSERT INTO fitness_percentile_standard (gender, min_age, max_age, fitness, percentile_rank, threshold_value) VALUES
('F', 19, 24, 'ENDURANCE', 80, 36), ('F', 19, 24, 'ENDURANCE', 60, 30), ('F', 19, 24, 'ENDURANCE', 40, 23),
('F', 25, 29, 'ENDURANCE', 80, 33), ('F', 25, 29, 'ENDURANCE', 60, 27), ('F', 25, 29, 'ENDURANCE', 40, 21),
('F', 30, 34, 'ENDURANCE', 80, 31), ('F', 30, 34, 'ENDURANCE', 60, 25), ('F', 30, 34, 'ENDURANCE', 40, 19),
('F', 35, 39, 'ENDURANCE', 80, 31), ('F', 35, 39, 'ENDURANCE', 60, 25), ('F', 35, 39, 'ENDURANCE', 40, 19),
('F', 40, 44, 'ENDURANCE', 80, 30), ('F', 40, 44, 'ENDURANCE', 60, 25), ('F', 40, 44, 'ENDURANCE', 40, 19),
('F', 45, 49, 'ENDURANCE', 80, 28), ('F', 45, 49, 'ENDURANCE', 60, 22), ('F', 45, 49, 'ENDURANCE', 40, 16),
('F', 50, 54, 'ENDURANCE', 80, 24), ('F', 50, 54, 'ENDURANCE', 60, 19), ('F', 50, 54, 'ENDURANCE', 40, 13),
('F', 55, 59, 'ENDURANCE', 80, 20), ('F', 55, 59, 'ENDURANCE', 60, 15), ('F', 55, 59, 'ENDURANCE', 40, 9),
('F', 60, 64, 'ENDURANCE', 80, 17), ('F', 60, 64, 'ENDURANCE', 60, 12), ('F', 60, 64, 'ENDURANCE', 40, 7);

-- FLEXIBILITY (앉아윗몸앞으로굽히기 cm) - 남자
INSERT INTO fitness_percentile_standard (gender, min_age, max_age, fitness, percentile_rank, threshold_value) VALUES
('M', 19, 24, 'FLEXIBILITY', 80, 16.1), ('M', 19, 24, 'FLEXIBILITY', 60, 11.1), ('M', 19, 24, 'FLEXIBILITY', 40, 6.1),
('M', 25, 29, 'FLEXIBILITY', 80, 14.9), ('M', 25, 29, 'FLEXIBILITY', 60, 10.1), ('M', 25, 29, 'FLEXIBILITY', 40, 5.3),
('M', 30, 34, 'FLEXIBILITY', 80, 14.2), ('M', 30, 34, 'FLEXIBILITY', 60,  9.4), ('M', 30, 34, 'FLEXIBILITY', 40, 4.6),
('M', 35, 39, 'FLEXIBILITY', 80, 14.0), ('M', 35, 39, 'FLEXIBILITY', 60,  9.3), ('M', 35, 39, 'FLEXIBILITY', 40, 4.6),
('M', 40, 44, 'FLEXIBILITY', 80, 14.2), ('M', 40, 44, 'FLEXIBILITY', 60,  9.5), ('M', 40, 44, 'FLEXIBILITY', 40, 4.8),
('M', 45, 49, 'FLEXIBILITY', 80, 13.6), ('M', 45, 49, 'FLEXIBILITY', 60,  9.1), ('M', 45, 49, 'FLEXIBILITY', 40, 4.6),
('M', 50, 54, 'FLEXIBILITY', 80, 13.9), ('M', 50, 54, 'FLEXIBILITY', 60,  9.3), ('M', 50, 54, 'FLEXIBILITY', 40, 4.7),
('M', 55, 59, 'FLEXIBILITY', 80, 13.3), ('M', 55, 59, 'FLEXIBILITY', 60,  8.6), ('M', 55, 59, 'FLEXIBILITY', 40, 3.9),
('M', 60, 64, 'FLEXIBILITY', 80, 11.8), ('M', 60, 64, 'FLEXIBILITY', 60,  7.1), ('M', 60, 64, 'FLEXIBILITY', 40, 2.3);

-- FLEXIBILITY (앉아윗몸앞으로굽히기 cm) - 여자
INSERT INTO fitness_percentile_standard (gender, min_age, max_age, fitness, percentile_rank, threshold_value) VALUES
('F', 19, 24, 'FLEXIBILITY', 80, 19.7), ('F', 19, 24, 'FLEXIBILITY', 60, 14.9), ('F', 19, 24, 'FLEXIBILITY', 40, 10.1),
('F', 25, 29, 'FLEXIBILITY', 80, 18.5), ('F', 25, 29, 'FLEXIBILITY', 60, 13.8), ('F', 25, 29, 'FLEXIBILITY', 40,  9.1),
('F', 30, 34, 'FLEXIBILITY', 80, 18.2), ('F', 30, 34, 'FLEXIBILITY', 60, 13.8), ('F', 30, 34, 'FLEXIBILITY', 40,  9.4),
('F', 35, 39, 'FLEXIBILITY', 80, 18.9), ('F', 35, 39, 'FLEXIBILITY', 60, 14.5), ('F', 35, 39, 'FLEXIBILITY', 40, 10.1),
('F', 40, 44, 'FLEXIBILITY', 80, 18.8), ('F', 40, 44, 'FLEXIBILITY', 60, 14.6), ('F', 40, 44, 'FLEXIBILITY', 40, 10.4),
('F', 45, 49, 'FLEXIBILITY', 80, 18.9), ('F', 45, 49, 'FLEXIBILITY', 60, 14.8), ('F', 45, 49, 'FLEXIBILITY', 40, 10.7),
('F', 50, 54, 'FLEXIBILITY', 80, 19.5), ('F', 50, 54, 'FLEXIBILITY', 60, 15.6), ('F', 50, 54, 'FLEXIBILITY', 40, 11.7),
('F', 55, 59, 'FLEXIBILITY', 80, 19.5), ('F', 55, 59, 'FLEXIBILITY', 60, 15.7), ('F', 55, 59, 'FLEXIBILITY', 40, 11.9),
('F', 60, 64, 'FLEXIBILITY', 80, 19.6), ('F', 60, 64, 'FLEXIBILITY', 60, 15.7), ('F', 60, 64, 'FLEXIBILITY', 40, 11.8);

-- AGILITY (반응시간 초 - 낮을수록 좋음, percentile_rank 반전 저장)
-- 실제 백분위 = 100 - percentile_rank
-- 저장 기준: 빠른(좋은) 반응시간 → 낮은 percentile_rank 저장 → 실제 높은 백분위
INSERT INTO fitness_percentile_standard (gender, min_age, max_age, fitness, percentile_rank, threshold_value) VALUES
('M', 19, 24, 'AGILITY', 20, 0.301), ('M', 19, 24, 'AGILITY', 40, 0.330),
('M', 25, 29, 'AGILITY', 20, 0.302), ('M', 25, 29, 'AGILITY', 40, 0.335),
('M', 30, 34, 'AGILITY', 20, 0.304), ('M', 30, 34, 'AGILITY', 40, 0.337),
('M', 35, 39, 'AGILITY', 20, 0.311), ('M', 35, 39, 'AGILITY', 40, 0.339),
('M', 40, 44, 'AGILITY', 20, 0.320), ('M', 40, 44, 'AGILITY', 40, 0.346),
('M', 45, 49, 'AGILITY', 20, 0.331), ('M', 45, 49, 'AGILITY', 40, 0.366),
('M', 50, 54, 'AGILITY', 20, 0.337), ('M', 50, 54, 'AGILITY', 40, 0.371),
('M', 55, 59, 'AGILITY', 20, 0.348), ('M', 55, 59, 'AGILITY', 40, 0.383),
('M', 60, 64, 'AGILITY', 20, 0.351), ('M', 60, 64, 'AGILITY', 40, 0.402);

INSERT INTO fitness_percentile_standard (gender, min_age, max_age, fitness, percentile_rank, threshold_value) VALUES
('F', 19, 24, 'AGILITY', 20, 0.332), ('F', 19, 24, 'AGILITY', 40, 0.374),
('F', 25, 29, 'AGILITY', 20, 0.343), ('F', 25, 29, 'AGILITY', 40, 0.383),
('F', 30, 34, 'AGILITY', 20, 0.347), ('F', 30, 34, 'AGILITY', 40, 0.381),
('F', 35, 39, 'AGILITY', 20, 0.348), ('F', 35, 39, 'AGILITY', 40, 0.388),
('F', 40, 44, 'AGILITY', 20, 0.345), ('F', 40, 44, 'AGILITY', 40, 0.382),
('F', 45, 49, 'AGILITY', 20, 0.350), ('F', 45, 49, 'AGILITY', 40, 0.392),
('F', 50, 54, 'AGILITY', 20, 0.354), ('F', 50, 54, 'AGILITY', 40, 0.395),
('F', 55, 59, 'AGILITY', 20, 0.369), ('F', 55, 59, 'AGILITY', 40, 0.416),
('F', 60, 64, 'AGILITY', 20, 0.387), ('F', 60, 64, 'AGILITY', 40, 0.434);

-- QUICKNESS (체공시간 초 - 높을수록 좋음) - 남자
INSERT INTO fitness_percentile_standard (gender, min_age, max_age, fitness, percentile_rank, threshold_value) VALUES
('M', 19, 24, 'QUICKNESS', 80, 0.605), ('M', 19, 24, 'QUICKNESS', 60, 0.568),
('M', 25, 29, 'QUICKNESS', 80, 0.591), ('M', 25, 29, 'QUICKNESS', 60, 0.559),
('M', 30, 34, 'QUICKNESS', 80, 0.583), ('M', 30, 34, 'QUICKNESS', 60, 0.548),
('M', 35, 39, 'QUICKNESS', 80, 0.581), ('M', 35, 39, 'QUICKNESS', 60, 0.551),
('M', 40, 44, 'QUICKNESS', 80, 0.547), ('M', 40, 44, 'QUICKNESS', 60, 0.521),
('M', 45, 49, 'QUICKNESS', 80, 0.524), ('M', 45, 49, 'QUICKNESS', 60, 0.497),
('M', 50, 54, 'QUICKNESS', 80, 0.527), ('M', 50, 54, 'QUICKNESS', 60, 0.486),
('M', 55, 59, 'QUICKNESS', 80, 0.508), ('M', 55, 59, 'QUICKNESS', 60, 0.475),
('M', 60, 64, 'QUICKNESS', 80, 0.474), ('M', 60, 64, 'QUICKNESS', 60, 0.443);

-- QUICKNESS (체공시간 초) - 여자
INSERT INTO fitness_percentile_standard (gender, min_age, max_age, fitness, percentile_rank, threshold_value) VALUES
('F', 19, 24, 'QUICKNESS', 80, 0.479), ('F', 19, 24, 'QUICKNESS', 60, 0.447),
('F', 25, 29, 'QUICKNESS', 80, 0.466), ('F', 25, 29, 'QUICKNESS', 60, 0.442),
('F', 30, 34, 'QUICKNESS', 80, 0.464), ('F', 30, 34, 'QUICKNESS', 60, 0.437),
('F', 35, 39, 'QUICKNESS', 80, 0.453), ('F', 35, 39, 'QUICKNESS', 60, 0.425),
('F', 40, 44, 'QUICKNESS', 80, 0.442), ('F', 40, 44, 'QUICKNESS', 60, 0.417),
('F', 45, 49, 'QUICKNESS', 80, 0.431), ('F', 45, 49, 'QUICKNESS', 60, 0.404),
('F', 50, 54, 'QUICKNESS', 80, 0.407), ('F', 50, 54, 'QUICKNESS', 60, 0.381),
('F', 55, 59, 'QUICKNESS', 80, 0.402), ('F', 55, 59, 'QUICKNESS', 60, 0.374),
('F', 60, 64, 'QUICKNESS', 80, 0.393), ('F', 60, 64, 'QUICKNESS', 60, 0.366);


-- ============================================
-- 완료!
-- 환경변수(DATABASE_URL)를 새 Supabase 프로젝트로 업데이트 후 서버를 재시작하세요.
-- ============================================
