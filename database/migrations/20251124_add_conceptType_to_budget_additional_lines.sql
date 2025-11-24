-- Migration: Add conceptType column to BudgetAdditionalLines
ALTER TABLE "BudgetAdditionalLines"
  ADD COLUMN IF NOT EXISTS "conceptType" VARCHAR(30) NOT NULL DEFAULT 'adjustment';

-- Backfill any NULLs just in case (older rows)
UPDATE "BudgetAdditionalLines"
SET "conceptType" = 'adjustment'
WHERE "conceptType" IS NULL;

-- Optional: ensure orderIndex has a default if missing
ALTER TABLE "BudgetAdditionalLines"
  ALTER COLUMN "orderIndex" SET DEFAULT 0;

-- Index to query by type per budget (optional performance)
CREATE INDEX IF NOT EXISTS "idx_BudgetAdditionalLines_budgetId_conceptType"
  ON "BudgetAdditionalLines"("budgetId", "conceptType");
