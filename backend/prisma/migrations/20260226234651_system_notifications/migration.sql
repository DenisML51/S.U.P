-- CreateTable
CREATE TABLE "SystemNotification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemNotification_isActive_publishedAt_idx" ON "SystemNotification"("isActive", "publishedAt");

-- CreateIndex
CREATE INDEX "UserNotificationRead_userId_readAt_idx" ON "UserNotificationRead"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationRead_userId_notificationId_key" ON "UserNotificationRead"("userId", "notificationId");

-- AddForeignKey
ALTER TABLE "UserNotificationRead" ADD CONSTRAINT "UserNotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationRead" ADD CONSTRAINT "UserNotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "SystemNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
