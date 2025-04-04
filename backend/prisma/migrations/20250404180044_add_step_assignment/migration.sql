-- AlterTable
ALTER TABLE "OcrResult" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "StepAssignment" (
    "stepId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepAssignment_pkey" PRIMARY KEY ("stepId","userId")
);

-- CreateIndex
CREATE INDEX "StepAssignment_stepId_idx" ON "StepAssignment"("stepId");

-- CreateIndex
CREATE INDEX "StepAssignment_userId_idx" ON "StepAssignment"("userId");

-- AddForeignKey
ALTER TABLE "StepAssignment" ADD CONSTRAINT "StepAssignment_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProductionStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepAssignment" ADD CONSTRAINT "StepAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
