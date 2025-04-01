/*
  Warnings:

  - Added the required column `createdById` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "createdById" TEXT;
-- Wypełnij tymczasowo istniejące dane (np. kopiując z userId)
UPDATE "Notification" SET "createdById" = "userId";

-- Potem ustaw kolumnę jako wymagającą
ALTER TABLE "Notification" ALTER COLUMN "createdById" SET NOT NULL;

