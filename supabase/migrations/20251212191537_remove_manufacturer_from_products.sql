-- Remove manufacturer column from Products table (now using supplierId FK to Suppliers)
BEGIN;

-- Drop the manufacturer column from Products
ALTER TABLE "Products"
  DROP COLUMN IF EXISTS "manufacturer";

-- Update BudgetItemTables: rename showManufacturer to showSupplier
ALTER TABLE "BudgetItemTables"
  RENAME COLUMN "showManufacturer" TO "showSupplier";

-- Update BudgetItemTableRows: remove manufacturer column and add supplierId FK
ALTER TABLE "BudgetItemTableRows"
  DROP COLUMN IF EXISTS "manufacturer";

ALTER TABLE "BudgetItemTableRows"
  ADD COLUMN "supplierId" bigint REFERENCES "Suppliers"("id") ON DELETE SET NULL;

COMMIT;
