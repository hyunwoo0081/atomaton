-- AlterTable
ALTER TABLE `workflow` ADD COLUMN `settings` JSON NULL,
    ADD COLUMN `ui_config` JSON NULL;
