-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "interviewReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interviewReminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Job_interviewDate_idx" ON "Job"("interviewDate");
