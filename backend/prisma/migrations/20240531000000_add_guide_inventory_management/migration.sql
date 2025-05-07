-- backend/prisma/migrations/20240531000000_add_warehouse_access/migration.sql

-- Create ProductionGuide table if it doesn't exist
CREATE TABLE IF NOT EXISTS "ProductionGuide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "autoPriority" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "accessPassword" TEXT,
    "deadline" TIMESTAMP(3),

    CONSTRAINT "ProductionGuide_pkey" PRIMARY KEY ("id")
);

-- Create GuideInventory table if it doesn't exist
CREATE TABLE IF NOT EXISTS "GuideInventory" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "stepId" TEXT,
    "reserved" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "withdrawnAt" TIMESTAMP(3),
    "withdrawnById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideInventory_pkey" PRIMARY KEY ("id")
);

-- Create GuideAccessLog table
CREATE TABLE IF NOT EXISTS "GuideAccessLog" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "itemsAccessed" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideAccessLog_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "ProductionGuide" ADD CONSTRAINT "ProductionGuide_createdById_fkey" 
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT;

ALTER TABLE "ProductionGuide" ADD CONSTRAINT "ProductionGuide_archivedById_fkey" 
    FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL;

ALTER TABLE "GuideInventory" ADD CONSTRAINT "GuideInventory_guideId_fkey" 
    FOREIGN KEY ("guideId") REFERENCES "ProductionGuide"("id") ON DELETE CASCADE;

ALTER TABLE "GuideInventory" ADD CONSTRAINT "GuideInventory_itemId_fkey" 
    FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT;

ALTER TABLE "GuideInventory" ADD CONSTRAINT "GuideInventory_withdrawnById_fkey" 
    FOREIGN KEY ("withdrawnById") REFERENCES "User"("id") ON DELETE SET NULL;

ALTER TABLE "GuideAccessLog" ADD CONSTRAINT "GuideAccessLog_guideId_fkey" 
    FOREIGN KEY ("guideId") REFERENCES "ProductionGuide"("id") ON DELETE CASCADE;

ALTER TABLE "GuideAccessLog" ADD CONSTRAINT "GuideAccessLog_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Create indexes
CREATE UNIQUE INDEX "ProductionGuide_barcode_key" ON "ProductionGuide"("barcode");
CREATE INDEX "ProductionGuide_createdById_idx" ON "ProductionGuide"("createdById");
CREATE INDEX "ProductionGuide_status_idx" ON "ProductionGuide"("status");
CREATE INDEX "ProductionGuide_priority_idx" ON "ProductionGuide"("priority");
CREATE INDEX "ProductionGuide_deadline_idx" ON "ProductionGuide"("deadline");

CREATE UNIQUE INDEX "GuideInventory_guideId_itemId_key" ON "GuideInventory"("guideId", "itemId");
CREATE INDEX "GuideInventory_guideId_idx" ON "GuideInventory"("guideId");
CREATE INDEX "GuideInventory_itemId_idx" ON "GuideInventory"("itemId");
CREATE INDEX "GuideInventory_stepId_idx" ON "GuideInventory"("stepId");
CREATE INDEX "GuideInventory_reserved_idx" ON "GuideInventory"("reserved");
CREATE INDEX "GuideInventory_status_idx" ON "GuideInventory"("status");
CREATE INDEX "GuideInventory_withdrawnById_idx" ON "GuideInventory"("withdrawnById");

CREATE INDEX "GuideAccessLog_guideId_idx" ON "GuideAccessLog"("guideId");
CREATE INDEX "GuideAccessLog_userId_idx" ON "GuideAccessLog"("userId");
CREATE INDEX "GuideAccessLog_accessType_idx" ON "GuideAccessLog"("accessType");