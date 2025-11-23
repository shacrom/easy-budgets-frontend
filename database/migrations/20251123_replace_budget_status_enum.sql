-- Crear ENUM para el estado de los presupuestos y limitarlo a dos valores
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BudgetStatus') THEN
    CREATE TYPE "BudgetStatus" AS ENUM ('completed', 'not_completed');
  END IF;
END $$;

ALTER TABLE "Budgets"
  ALTER COLUMN "status" DROP DEFAULT,
  DROP CONSTRAINT IF EXISTS "Budgets_status_check";

ALTER TABLE "Budgets"
  ALTER COLUMN "status" TYPE "BudgetStatus"
  USING CASE
    WHEN "status"::text = 'completed' THEN 'completed'::"BudgetStatus"
    ELSE 'not_completed'::"BudgetStatus"
  END;

ALTER TABLE "Budgets"
  ALTER COLUMN "status" SET DEFAULT 'not_completed';
