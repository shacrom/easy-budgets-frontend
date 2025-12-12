-- Consolidate legacy BudgetStatus values into: not_completed, completed, contract
-- Mapping:
--   draft/pending/rejected -> not_completed
--   approved/confirmed/delivered -> completed
--   contract stays contract

BEGIN;

-- Create new enum with target values if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budgetstatusnew') THEN
        CREATE TYPE "BudgetStatusNew" AS ENUM ('not_completed', 'completed', 'contract');
    END IF;
END$$;

-- Migrate column values using mapping
ALTER TABLE "Budgets"
  ALTER COLUMN "status" TYPE "BudgetStatusNew"
  USING (
    CASE
      WHEN status IN ('draft', 'pending', 'rejected') THEN 'not_completed'
      WHEN status IN ('approved', 'confirmed', 'delivered') THEN 'completed'
      WHEN status = 'contract' THEN 'contract'
      ELSE 'not_completed'
    END
  )::"BudgetStatusNew";

-- Drop old enum and rename new
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budgetstatus') THEN
        DROP TYPE "BudgetStatus";
    END IF;
END$$;

ALTER TYPE "BudgetStatusNew" RENAME TO "BudgetStatus";

COMMIT;
