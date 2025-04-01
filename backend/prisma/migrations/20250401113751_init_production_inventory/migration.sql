-- CreateTable
CREATE TABLE "ProductionGuide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "ProductionGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionStep" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "estimatedTime" INTEGER,
    "actualTime" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedToRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepComment" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentRecipient" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepWorkSession" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepWorkSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "productionGuideId" TEXT,
    "productionStepId" TEXT,
    "commentId" TEXT,
    "inventoryItemId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "barcode" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "location" TEXT,
    "minQuantity" DOUBLE PRECISION,
    "category" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "guideId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideInventory" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "stepId" TEXT,
    "reserved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionGuide_barcode_key" ON "ProductionGuide"("barcode");

-- CreateIndex
CREATE INDEX "ProductionGuide_barcode_idx" ON "ProductionGuide"("barcode");

-- CreateIndex
CREATE INDEX "ProductionGuide_createdById_idx" ON "ProductionGuide"("createdById");

-- CreateIndex
CREATE INDEX "ProductionGuide_status_idx" ON "ProductionGuide"("status");

-- CreateIndex
CREATE INDEX "ProductionGuide_priority_idx" ON "ProductionGuide"("priority");

-- CreateIndex
CREATE INDEX "ProductionStep_guideId_idx" ON "ProductionStep"("guideId");

-- CreateIndex
CREATE INDEX "ProductionStep_status_idx" ON "ProductionStep"("status");

-- CreateIndex
CREATE INDEX "ProductionStep_assignedToRole_idx" ON "ProductionStep"("assignedToRole");

-- CreateIndex
CREATE INDEX "StepComment_stepId_idx" ON "StepComment"("stepId");

-- CreateIndex
CREATE INDEX "StepComment_userId_idx" ON "StepComment"("userId");

-- CreateIndex
CREATE INDEX "CommentRecipient_commentId_idx" ON "CommentRecipient"("commentId");

-- CreateIndex
CREATE INDEX "CommentRecipient_userId_idx" ON "CommentRecipient"("userId");

-- CreateIndex
CREATE INDEX "CommentRecipient_isRead_idx" ON "CommentRecipient"("isRead");

-- CreateIndex
CREATE INDEX "StepWorkSession_stepId_idx" ON "StepWorkSession"("stepId");

-- CreateIndex
CREATE INDEX "StepWorkSession_userId_idx" ON "StepWorkSession"("userId");

-- CreateIndex
CREATE INDEX "StepWorkSession_startTime_idx" ON "StepWorkSession"("startTime");

-- CreateIndex
CREATE INDEX "Attachment_productionGuideId_idx" ON "Attachment"("productionGuideId");

-- CreateIndex
CREATE INDEX "Attachment_productionStepId_idx" ON "Attachment"("productionStepId");

-- CreateIndex
CREATE INDEX "Attachment_commentId_idx" ON "Attachment"("commentId");

-- CreateIndex
CREATE INDEX "Attachment_inventoryItemId_idx" ON "Attachment"("inventoryItemId");

-- CreateIndex
CREATE INDEX "Attachment_createdById_idx" ON "Attachment"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_barcode_key" ON "InventoryItem"("barcode");

-- CreateIndex
CREATE INDEX "InventoryItem_barcode_idx" ON "InventoryItem"("barcode");

-- CreateIndex
CREATE INDEX "InventoryItem_createdById_idx" ON "InventoryItem"("createdById");

-- CreateIndex
CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");

-- CreateIndex
CREATE INDEX "InventoryTransaction_itemId_idx" ON "InventoryTransaction"("itemId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_userId_idx" ON "InventoryTransaction"("userId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_type_idx" ON "InventoryTransaction"("type");

-- CreateIndex
CREATE INDEX "InventoryTransaction_guideId_idx" ON "InventoryTransaction"("guideId");

-- CreateIndex
CREATE INDEX "GuideInventory_guideId_idx" ON "GuideInventory"("guideId");

-- CreateIndex
CREATE INDEX "GuideInventory_itemId_idx" ON "GuideInventory"("itemId");

-- CreateIndex
CREATE INDEX "GuideInventory_stepId_idx" ON "GuideInventory"("stepId");

-- CreateIndex
CREATE INDEX "GuideInventory_reserved_idx" ON "GuideInventory"("reserved");

-- CreateIndex
CREATE UNIQUE INDEX "GuideInventory_guideId_itemId_key" ON "GuideInventory"("guideId", "itemId");

-- AddForeignKey
ALTER TABLE "ProductionGuide" ADD CONSTRAINT "ProductionGuide_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionStep" ADD CONSTRAINT "ProductionStep_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "ProductionGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepComment" ADD CONSTRAINT "StepComment_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProductionStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepComment" ADD CONSTRAINT "StepComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentRecipient" ADD CONSTRAINT "CommentRecipient_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "StepComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentRecipient" ADD CONSTRAINT "CommentRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepWorkSession" ADD CONSTRAINT "StepWorkSession_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProductionStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepWorkSession" ADD CONSTRAINT "StepWorkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_productionGuideId_fkey" FOREIGN KEY ("productionGuideId") REFERENCES "ProductionGuide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_productionStepId_fkey" FOREIGN KEY ("productionStepId") REFERENCES "ProductionStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "StepComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideInventory" ADD CONSTRAINT "GuideInventory_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "ProductionGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideInventory" ADD CONSTRAINT "GuideInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
