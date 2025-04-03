-- CreateTable
CREATE TABLE "GuideAssignment" (
    "guideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GuideAssignment_pkey" PRIMARY KEY ("guideId","userId")
);

-- CreateIndex
CREATE INDEX "GuideAssignment_guideId_idx" ON "GuideAssignment"("guideId");

-- CreateIndex
CREATE INDEX "GuideAssignment_userId_idx" ON "GuideAssignment"("userId");

-- AddForeignKey
ALTER TABLE "GuideAssignment" ADD CONSTRAINT "GuideAssignment_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "ProductionGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideAssignment" ADD CONSTRAINT "GuideAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
