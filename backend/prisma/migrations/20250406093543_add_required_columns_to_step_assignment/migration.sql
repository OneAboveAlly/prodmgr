-- 1. Najpierw dodaj nowe kolumny jako NULLABLE
ALTER TABLE "StepAssignment" ADD COLUMN "id" TEXT;
ALTER TABLE "StepAssignment" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- 2. Wypełnij istniejące rekordy wartościami domyślnymi
-- Użyj uuid_generate_v4() jeśli gen_random_uuid() nie działa
UPDATE "StepAssignment" SET 
  "id" = gen_random_uuid()::TEXT,
  "updatedAt" = CURRENT_TIMESTAMP;

-- 3. Usuń stary klucz główny (jeśli istnieje)
ALTER TABLE "StepAssignment" DROP CONSTRAINT IF EXISTS "StepAssignment_pkey";

-- 4. Zmień kolumny na NOT NULL
ALTER TABLE "StepAssignment" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "StepAssignment" ALTER COLUMN "updatedAt" SET NOT NULL;

-- 5. Dodaj nowy klucz główny
ALTER TABLE "StepAssignment" ADD CONSTRAINT "StepAssignment_pkey" PRIMARY KEY ("id");

-- 6. Dodaj unikalny constraint (tylko jeśli nie ma duplikatów)
-- Najpierw sprawdź czy nie ma duplikatów:
-- SELECT "stepId", "userId", COUNT(*) FROM "StepAssignment" GROUP BY "stepId", "userId" HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS "StepAssignment_stepId_userId_key" ON "StepAssignment"("stepId", "userId");

-- Aktualizacja innych tabel (z oryginalnej migracji)
ALTER TABLE "GuideInventory" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "StepInventory" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;