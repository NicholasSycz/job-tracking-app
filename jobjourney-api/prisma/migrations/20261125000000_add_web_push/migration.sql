ALTER TABLE "User"
ADD COLUMN "pushFollowUps" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "pushInterviews" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "WebPushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "vapidPublicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebPushSubscription_endpoint_key" ON "WebPushSubscription"("endpoint");
CREATE INDEX "WebPushSubscription_userId_idx" ON "WebPushSubscription"("userId");
ALTER TABLE "WebPushSubscription" ADD CONSTRAINT "WebPushSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NotificationDelivery" (
    "subscriptionId" TEXT NOT NULL,
    "reminderKey" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("subscriptionId", "reminderKey")
);
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "WebPushSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
