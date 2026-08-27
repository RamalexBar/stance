-- CreateTable
CREATE TABLE "GpsTrack" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "pointsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GpsTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GpsTrack_videoId_key" ON "GpsTrack"("videoId");

-- AddForeignKey
ALTER TABLE "GpsTrack" ADD CONSTRAINT "GpsTrack_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
