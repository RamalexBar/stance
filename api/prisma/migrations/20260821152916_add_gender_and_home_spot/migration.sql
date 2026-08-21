-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'TRAINER', 'ATHLETE', 'SCHOOL', 'GUEST');

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('KITESURF', 'WINGFOIL');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO');

-- CreateEnum
CREATE TYPE "Dominance" AS ENUM ('REGULAR', 'GOOFY');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'APPLE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "VideoSource" AS ENUM ('RECORDED_IN_APP', 'GALLERY', 'GOPRO', 'INSTA360', 'DJI');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED');

-- CreateEnum
CREATE TYPE "PoseAnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BiomechanicsStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MovementStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ErrorAnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ComparisonMode" AS ENUM ('SELF_PREVIOUS', 'TRAINER', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "InjuryLevel" AS ENUM ('LEVE', 'MODERADO', 'ALTO');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PREMIUM', 'COACH', 'ACADEMIA');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');

-- CreateEnum
CREATE TYPE "CoachPlanStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "age" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "gender" "Gender",
    "level" "SkillLevel",
    "dominance" "Dominance",
    "provider" "AuthProvider" NOT NULL DEFAULT 'EMAIL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "homeSpotName" TEXT,
    "homeSpotLat" DOUBLE PRECISION,
    "homeSpotLon" DOUBLE PRECISION,
    "homeSpotSeaDirectionDeg" DOUBLE PRECISION,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "UserDiscipline" (
    "userId" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,

    CONSTRAINT "UserDiscipline_pkey" PRIMARY KEY ("userId","discipline")
);

-- CreateTable
CREATE TABLE "VideoSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "source" "VideoSource" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalName" TEXT,
    "durationSeconds" DOUBLE PRECISION,
    "fileSizeBytes" INTEGER,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isReference" BOOLEAN NOT NULL DEFAULT false,
    "referenceLabel" TEXT,

    CONSTRAINT "VideoSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoseAnalysis" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "status" "PoseAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "fps" DOUBLE PRECISION,
    "frameCount" INTEGER,
    "avgConfidence" DOUBLE PRECISION,
    "framesJson" JSONB,
    "engine" TEXT NOT NULL DEFAULT 'mediapipe-pose-landmarker-lite',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoseAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiomechanicsAnalysis" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "status" "BiomechanicsStatus" NOT NULL DEFAULT 'PENDING',
    "seriesJson" JSONB,
    "summaryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiomechanicsAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovementAnalysis" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "status" "MovementStatus" NOT NULL DEFAULT 'PENDING',
    "segmentsJson" JSONB,
    "notDetectedYet" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovementAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorAnalysis" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "status" "ErrorAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "findingsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErrorAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoComparison" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "ComparisonMode" NOT NULL,
    "primaryVideoId" TEXT NOT NULL,
    "referenceVideoId" TEXT NOT NULL,
    "primaryScore" DOUBLE PRECISION NOT NULL,
    "referenceScore" DOUBLE PRECISION NOT NULL,
    "metricsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InjuryLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "bodyPart" TEXT NOT NULL,
    "severity" "InjuryLevel" NOT NULL,
    "description" TEXT,
    "relatedVideoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InjuryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupTrainer" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GroupTrainer_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "GroupAthlete" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupAthlete_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachPlan" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "status" "CoachPlanStatus" NOT NULL DEFAULT 'PENDING',
    "planJson" JSONB,
    "userNotes" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSession_storagePath_key" ON "VideoSession"("storagePath");

-- CreateIndex
CREATE INDEX "VideoSession_userId_createdAt_idx" ON "VideoSession"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PoseAnalysis_videoId_key" ON "PoseAnalysis"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "BiomechanicsAnalysis_videoId_key" ON "BiomechanicsAnalysis"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "MovementAnalysis_videoId_key" ON "MovementAnalysis"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorAnalysis_videoId_key" ON "ErrorAnalysis"("videoId");

-- CreateIndex
CREATE INDEX "VideoComparison_primaryVideoId_createdAt_idx" ON "VideoComparison"("primaryVideoId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachPlan_videoId_key" ON "CoachPlan"("videoId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDiscipline" ADD CONSTRAINT "UserDiscipline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSession" ADD CONSTRAINT "VideoSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoseAnalysis" ADD CONSTRAINT "PoseAnalysis_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiomechanicsAnalysis" ADD CONSTRAINT "BiomechanicsAnalysis_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementAnalysis" ADD CONSTRAINT "MovementAnalysis_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorAnalysis" ADD CONSTRAINT "ErrorAnalysis_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoComparison" ADD CONSTRAINT "VideoComparison_primaryVideoId_fkey" FOREIGN KEY ("primaryVideoId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoComparison" ADD CONSTRAINT "VideoComparison_referenceVideoId_fkey" FOREIGN KEY ("referenceVideoId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InjuryLog" ADD CONSTRAINT "InjuryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTrainer" ADD CONSTRAINT "GroupTrainer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTrainer" ADD CONSTRAINT "GroupTrainer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAthlete" ADD CONSTRAINT "GroupAthlete_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAthlete" ADD CONSTRAINT "GroupAthlete_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachPlan" ADD CONSTRAINT "CoachPlan_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
