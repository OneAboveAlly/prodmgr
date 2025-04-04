-- AlterTable
ALTER TABLE "ProductionGuide" ADD COLUMN     "autoPriority" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deadline" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GuideChangeHistory" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideChangeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepWorkEntry" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timeWorked" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepWorkEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepInventory" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEEDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrResult" (
    "id" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "manuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "stepId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuideChangeHistory_guideId_idx" ON "GuideChangeHistory"("guideId");

-- CreateIndex
CREATE INDEX "GuideChangeHistory_userId_idx" ON "GuideChangeHistory"("userId");

-- CreateIndex
CREATE INDEX "StepWorkEntry_stepId_idx" ON "StepWorkEntry"("stepId");

-- CreateIndex
CREATE INDEX "StepWorkEntry_userId_idx" ON "StepWorkEntry"("userId");

-- CreateIndex
CREATE INDEX "StepInventory_stepId_idx" ON "StepInventory"("stepId");

-- CreateIndex
CREATE INDEX "StepInventory_itemId_idx" ON "StepInventory"("itemId");

-- CreateIndex
CREATE INDEX "StepInventory_status_idx" ON "StepInventory"("status");

-- CreateIndex
CREATE INDEX "OcrResult_stepId_idx" ON "OcrResult"("stepId");

-- CreateIndex
CREATE INDEX "OcrResult_userId_idx" ON "OcrResult"("userId");

-- CreateIndex
CREATE INDEX "ProductionGuide_deadline_idx" ON "ProductionGuide"("deadline");

-- AddForeignKey
ALTER TABLE "GuideChangeHistory" ADD CONSTRAINT "GuideChangeHistory_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "ProductionGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideChangeHistory" ADD CONSTRAINT "GuideChangeHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepWorkEntry" ADD CONSTRAINT "StepWorkEntry_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProductionStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepWorkEntry" ADD CONSTRAINT "StepWorkEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepInventory" ADD CONSTRAINT "StepInventory_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProductionStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepInventory" ADD CONSTRAINT "StepInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrResult" ADD CONSTRAINT "OcrResult_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProductionStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrResult" ADD CONSTRAINT "OcrResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
