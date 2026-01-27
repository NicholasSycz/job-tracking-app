-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "externalJobId" TEXT,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "source" TEXT;

-- CreateIndex
CREATE INDEX "Job_followUpDate_idx" ON "Job"("followUpDate");

-- CreateIndex
CREATE INDEX "Job_tenantId_externalJobId_idx" ON "Job"("tenantId", "externalJobId");
