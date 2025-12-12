-- Remove manufacturer column from SupplierOrderItems and add supplierId instead
-- This makes the schema consistent - we use supplierId FK everywhere instead of manufacturer strings

-- Drop the manufacturer column
ALTER TABLE "SupplierOrderItems" DROP COLUMN IF EXISTS "manufacturer";

-- Add supplierId column with FK to Suppliers table
ALTER TABLE "SupplierOrderItems" ADD COLUMN IF NOT EXISTS "supplierId" bigint;

-- Add foreign key constraint
ALTER TABLE "SupplierOrderItems"
  ADD CONSTRAINT "SupplierOrderItems_supplierId_fkey"
  FOREIGN KEY ("supplierId")
  REFERENCES "Suppliers"("id")
  ON DELETE SET NULL;
