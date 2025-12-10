-- Force PostgREST schema cache refresh by making a trivial change
-- This helps ensure the renamed tables are recognized by the API

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Add a comment to force schema update
COMMENT ON TABLE "BudgetCompositeBlocks" IS 'Composite blocks for budgets (formerly BudgetTextBlocks)';
COMMENT ON TABLE "BudgetItemTables" IS 'Item tables for budgets (formerly BudgetMaterialTables)';
