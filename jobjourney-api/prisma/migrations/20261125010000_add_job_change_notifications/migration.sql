CREATE TYPE "ApplicationNotificationType" AS ENUM ('JOB_ADDED', 'JOB_UPDATED');

ALTER TABLE "User"
ADD COLUMN "pushJobAdded" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "pushJobUpdated" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "NotificationDelivery"
ADD COLUMN "tenantId" TEXT,
ADD COLUMN "eventType" "ApplicationNotificationType",
ADD COLUMN "payload" JSONB,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "NotificationDelivery_eventType_sentAt_createdAt_idx"
ON "NotificationDelivery"("eventType", "sentAt", "createdAt");

ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
