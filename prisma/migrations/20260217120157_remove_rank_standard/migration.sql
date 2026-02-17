-- CreateTable
CREATE TABLE "daily_recommendation" (
    "recommendation_id" BIGSERIAL NOT NULL,
    "member_id" BIGINT NOT NULL,
    "total_duration" SMALLINT,
    "rpe" SMALLINT,
    "recommendation_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_fitness_type" VARCHAR,
    "ai_prompt" TEXT,
    "ai_response" TEXT,
    "status" VARCHAR,
    "deleted_yn" VARCHAR,

    CONSTRAINT "daily_recommendation_pkey" PRIMARY KEY ("recommendation_id")
);

-- CreateTable
CREATE TABLE "daily_recommendation_exercise" (
    "recommendation_exercise_id" BIGSERIAL NOT NULL,
    "recommendation_id" BIGINT NOT NULL,
    "exercise_name" VARCHAR NOT NULL,
    "reps" SMALLINT,
    "sets" SMALLINT,
    "rest_seconds" SMALLINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "exercise_id" BIGINT NOT NULL,
    "duration" SMALLINT,

    CONSTRAINT "daily_recommendation_exercise_pkey" PRIMARY KEY ("recommendation_exercise_id")
);

-- CreateTable
CREATE TABLE "exercise_program" (
    "exercise_id" BIGSERIAL NOT NULL,
    "exercise_name" VARCHAR,
    "exercise_step" VARCHAR,
    "equipment" VARCHAR,
    "caution" VARCHAR,
    "fitness_type" VARCHAR,
    "purpose" VARCHAR,

    CONSTRAINT "exercise_program_pkey" PRIMARY KEY ("exercise_id")
);

-- CreateTable
CREATE TABLE "fitness_measure" (
    "measure_id" BIGSERIAL NOT NULL,
    "member_id" BIGINT,
    "age" SMALLINT NOT NULL,
    "age_range" JSONB NOT NULL,
    "measure_day" DATE NOT NULL,
    "gender" VARCHAR NOT NULL,
    "height" DECIMAL,
    "weight" DECIMAL,
    "bmi" DECIMAL,
    "fitness_result" JSONB,
    "rpe" SMALLINT,
    "measure_place" VARCHAR,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" VARCHAR DEFAULT 'N',

    CONSTRAINT "fitness_measure_pkey" PRIMARY KEY ("measure_id")
);

-- CreateTable
CREATE TABLE "member" (
    "member_id" BIGSERIAL NOT NULL,
    "email" VARCHAR NOT NULL,
    "name" VARCHAR,
    "birth_date" DATE,
    "gender" VARCHAR NOT NULL,
    "height" DECIMAL,
    "weight" DECIMAL,
    "bmi" DECIMAL,
    "profile_url" TEXT,
    "phone_number" VARCHAR(20),
    "withdraw_reason" VARCHAR,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" VARCHAR NOT NULL DEFAULT 'N',

    CONSTRAINT "member_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "recommendation_feedback" (
    "feedback_id" BIGSERIAL NOT NULL,
    "recommendation_id" BIGINT NOT NULL,
    "member_id" BIGINT,
    "completed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "difficulty_rating" SMALLINT,
    "satisfaction_rating" SMALLINT,
    "actual_duration" SMALLINT,

    CONSTRAINT "recommendation_feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "refresh_token_id" BIGSERIAL NOT NULL,
    "member_id" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("refresh_token_id")
);

-- CreateTable
CREATE TABLE "social_auth" (
    "social_auth_id" BIGSERIAL NOT NULL,
    "member_id" BIGINT NOT NULL,
    "provider" VARCHAR NOT NULL,
    "provider_user_id" VARCHAR NOT NULL,
    "consent_scope" VARCHAR,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" VARCHAR DEFAULT 'N',

    CONSTRAINT "social_auth_pkey" PRIMARY KEY ("social_auth_id")
);

-- CreateTable
CREATE TABLE "user_exercise_information" (
    "exercise_info_id" BIGSERIAL NOT NULL,
    "member_id" BIGINT NOT NULL,
    "goal" VARCHAR NOT NULL,
    "place" VARCHAR NOT NULL,
    "equipment" VARCHAR,
    "disease" VARCHAR,
    "injury" VARCHAR,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" VARCHAR DEFAULT 'N',

    CONSTRAINT "exercise_information_pkey" PRIMARY KEY ("exercise_info_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_member_recommendation_date" ON "daily_recommendation"("member_id", "recommendation_date");

-- CreateIndex
CREATE INDEX "fitness_measure_measure_day_idx" ON "fitness_measure"("measure_day");

-- CreateIndex
CREATE INDEX "fitness_measure_member_id_measure_day_idx" ON "fitness_measure"("member_id", "measure_day");

-- CreateIndex
CREATE UNIQUE INDEX "uq_member_measure_day" ON "fitness_measure"("member_id", "measure_day");

-- CreateIndex
CREATE UNIQUE INDEX "member_phone_number_key" ON "member"("phone_number");

-- AddForeignKey
ALTER TABLE "daily_recommendation" ADD CONSTRAINT "recommend_schedule_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "daily_recommendation_exercise" ADD CONSTRAINT "daily_recommendation_exercise_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "daily_recommendation"("recommendation_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "daily_recommendation_exercise" ADD CONSTRAINT "recommend_schedule_detail_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise_program"("exercise_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fitness_measure" ADD CONSTRAINT "fitness_measure_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "daily_recommendation"("recommendation_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social_auth" ADD CONSTRAINT "social_auth_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_exercise_information" ADD CONSTRAINT "exercise_information_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
