-- CreateEnum
CREATE TYPE "InterviewOutcome" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'DECLINED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "interviewOutcome" "InterviewOutcome";
