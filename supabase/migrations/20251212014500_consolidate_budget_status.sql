-- Consolidate legacy BudgetStatus values into: not_completed, completed
-- Original enum: 'not_completed', 'draft', 'pending', 'approved', 'rejected'
-- Mapping:
--   not_completed stays not_completed
--   draft/pending/rejected -> not_completed
--   approved -> completed

BEGIN;

-- Create new enum with target values
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budgetstatusnew') THEN
        CREATE TYPE "BudgetStatusNew" AS ENUM ('not_completed', 'completed');
    END IF;
END$$;

-- First, drop the default constraint temporarily
ALTER TABLE "Budgets"
  ALTER COLUMN "status" DROP DEFAULT;

-- Migrate column values using mapping
ALTER TABLE "Budgets"
  ALTER COLUMN "status" TYPE "BudgetStatusNew"
  USING (
    CASE
      WHEN status::text = 'approved' THEN 'completed'
      ELSE 'not_completed'
    END
  )::"BudgetStatusNew";

-- Drop old enum (must do this after column is converted)
DROP TYPE "BudgetStatus";

-- Rename new enum to replace old
ALTER TYPE "BudgetStatusNew" RENAME TO "BudgetStatus";

-- Restore default constraint with new enum
ALTER TABLE "Budgets"
  ALTER COLUMN "status" SET DEFAULT 'not_completed'::"BudgetStatus";

COMMIT;
