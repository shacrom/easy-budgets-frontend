-- Migration: Change default values for section visibility to false
-- Date: 2024-12-10
-- Description: Updates all "show*" columns in Budgets table to have DEFAULT false instead of true
-- This ensures new budgets start with all sections unmarked by default

-- Change default values for section visibility columns
ALTER TABLE "Budgets"
  ALTER COLUMN "showCompositeBlocks" SET DEFAULT false;

ALTER TABLE "Budgets"
  ALTER COLUMN "showItemTables" SET DEFAULT false;

ALTER TABLE "Budgets"
  ALTER COLUMN "showSimpleBlock" SET DEFAULT false;

ALTER TABLE "Budgets"
  ALTER COLUMN "showConditions" SET DEFAULT false;

ALTER TABLE "Budgets"
  ALTER COLUMN "showSummary" SET DEFAULT false;

ALTER TABLE "Budgets"
  ALTER COLUMN "showSignature" SET DEFAULT false;

-- Note: This only affects NEW rows. Existing budgets retain their current values.
-- If you want to update existing budgets, run:
-- UPDATE "Budgets" SET
--   "showCompositeBlocks" = false,
--   "showItemTables" = false,
--   "showSimpleBlock" = false,
--   "showConditions" = false,
--   "showSummary" = false,
--   "showSignature" = false;
