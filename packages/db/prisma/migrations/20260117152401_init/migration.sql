/*
  Warnings:

  - You are about to alter the column `credentials` on the `account` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.
  - You are about to alter the column `status` on the `log` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.

*/
-- AlterTable
ALTER TABLE `account` MODIFY `credentials` JSON NOT NULL;

-- AlterTable
ALTER TABLE `log` ADD COLUMN `actionId` VARCHAR(191) NULL,
    ADD COLUMN `executionId` VARCHAR(191) NULL,
    ADD COLUMN `source` VARCHAR(191) NULL,
    ADD COLUMN `triggerId` VARCHAR(191) NULL,
    MODIFY `status` ENUM('SUCCESS', 'FAILURE', 'SKIPPED', 'ENQUEUED') NOT NULL;
