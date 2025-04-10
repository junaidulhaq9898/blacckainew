/*
  Warnings:

  - You are about to drop the column `instagramId` on the `Automation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Automation_userId_instagramId_key";

-- AlterTable
ALTER TABLE "Automation" DROP COLUMN "instagramId";
