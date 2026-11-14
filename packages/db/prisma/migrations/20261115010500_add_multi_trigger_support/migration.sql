-- AlterTable
ALTER TABLE `Trigger` ADD COLUMN `nodeId` VARCHAR(191) NULL,
    ADD COLUMN `webhookToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Trigger_webhookToken_key` ON `Trigger`(`webhookToken`);

-- CreateIndex
CREATE INDEX `Trigger_workflowId_idx` ON `Trigger`(`workflowId`);

-- DropIndex
DROP INDEX `Trigger_workflowId_key` ON `Trigger`;
