-- Add logo URL columns to Budgets table
-- Company logo appears on the left side of the PDF header
-- Supplier logo appears on the right side of the PDF header (optional)

ALTER TABLE "Budgets"
ADD COLUMN IF NOT EXISTS "companyLogoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "supplierLogoUrl" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "Budgets"."companyLogoUrl" IS 'URL of the company logo to display on the left side of the PDF header';
COMMENT ON COLUMN "Budgets"."supplierLogoUrl" IS 'URL of the supplier/provider logo to display on the right side of the PDF header (optional)';
