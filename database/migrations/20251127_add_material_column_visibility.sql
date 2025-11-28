-- Migration: Add column visibility settings to BudgetMaterialTables
-- This allows users to control which columns are visible in the PDF export per table

ALTER TABLE "BudgetMaterialTables"
ADD COLUMN IF NOT EXISTS "showReference" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "showDescription" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "showManufacturer" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "showQuantity" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "showUnitPrice" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "showTotalPrice" BOOLEAN NOT NULL DEFAULT TRUE;

-- Add comment for documentation
COMMENT ON COLUMN "BudgetMaterialTables"."showReference" IS 'Whether to show the reference column in PDF export';
COMMENT ON COLUMN "BudgetMaterialTables"."showDescription" IS 'Whether to show the description column in PDF export';
COMMENT ON COLUMN "BudgetMaterialTables"."showManufacturer" IS 'Whether to show the manufacturer column in PDF export';
COMMENT ON COLUMN "BudgetMaterialTables"."showQuantity" IS 'Whether to show the quantity column in PDF export';
COMMENT ON COLUMN "BudgetMaterialTables"."showUnitPrice" IS 'Whether to show the unit price column in PDF export';
COMMENT ON COLUMN "BudgetMaterialTables"."showTotalPrice" IS 'Whether to show the total price column in PDF export';
