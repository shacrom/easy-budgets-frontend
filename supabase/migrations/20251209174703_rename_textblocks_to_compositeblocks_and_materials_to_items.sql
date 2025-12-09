-- =============================================================================
-- MIGRATION: Rename TextBlocks to CompositeBlocks and Materials to Items
-- =============================================================================
-- This migration renames tables to better reflect their purpose:
-- - BudgetTextBlocks -> BudgetCompositeBlocks (bloques compuestos)
-- - BudgetTextBlockSections -> BudgetCompositeBlockSections
-- - TextBlockTemplates -> CompositeBlockTemplates
-- - TextBlockTemplateSections -> CompositeBlockTemplateSections
-- - BudgetMaterialTables -> BudgetItemTables (tablas de elementos genéricos)
-- - BudgetMaterialTableRows -> BudgetItemTableRows
-- - Columns in Budgets table: showTextBlocks -> showCompositeBlocks,
--   showMaterials -> showItemTables, materialsSectionTitle -> itemTablesSectionTitle
-- =============================================================================

-- ============================================
-- STEP 1: Rename TextBlocks related tables
-- ============================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS "update_BudgetTextBlocks_updatedAt" ON "BudgetTextBlocks";
DROP TRIGGER IF EXISTS "update_BudgetTextBlockSections_updatedAt" ON "BudgetTextBlockSections";
DROP TRIGGER IF EXISTS "update_TextBlockTemplates_updatedAt" ON "TextBlockTemplates";
DROP TRIGGER IF EXISTS "update_TextBlockTemplateSections_updatedAt" ON "TextBlockTemplateSections";

-- Rename BudgetTextBlockSections -> BudgetCompositeBlockSections
-- (rename child table first to avoid FK issues)
ALTER TABLE "BudgetTextBlockSections" RENAME TO "BudgetCompositeBlockSections";

-- Rename column textBlockId -> compositeBlockId in BudgetCompositeBlockSections
ALTER TABLE "BudgetCompositeBlockSections" RENAME COLUMN "textBlockId" TO "compositeBlockId";

-- Rename BudgetTextBlocks -> BudgetCompositeBlocks
ALTER TABLE "BudgetTextBlocks" RENAME TO "BudgetCompositeBlocks";

-- Rename TextBlockTemplateSections -> CompositeBlockTemplateSections
ALTER TABLE "TextBlockTemplateSections" RENAME TO "CompositeBlockTemplateSections";

-- Rename TextBlockTemplates -> CompositeBlockTemplates
ALTER TABLE "TextBlockTemplates" RENAME TO "CompositeBlockTemplates";

-- Recreate triggers with new names
CREATE TRIGGER "update_BudgetCompositeBlocks_updatedAt"
  BEFORE UPDATE ON "BudgetCompositeBlocks"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "update_BudgetCompositeBlockSections_updatedAt"
  BEFORE UPDATE ON "BudgetCompositeBlockSections"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "update_CompositeBlockTemplates_updatedAt"
  BEFORE UPDATE ON "CompositeBlockTemplates"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "update_CompositeBlockTemplateSections_updatedAt"
  BEFORE UPDATE ON "CompositeBlockTemplateSections"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Rename indexes
ALTER INDEX IF EXISTS "BudgetTextBlocks_budgetId_idx" RENAME TO "BudgetCompositeBlocks_budgetId_idx";

-- ============================================
-- STEP 2: Rename Materials related tables
-- ============================================

-- Rename BudgetMaterialTableRows -> BudgetItemTableRows (child first)
ALTER TABLE "BudgetMaterialTableRows" RENAME TO "BudgetItemTableRows";

-- Rename BudgetMaterialTables -> BudgetItemTables
ALTER TABLE "BudgetMaterialTables" RENAME TO "BudgetItemTables";

-- Rename indexes
ALTER INDEX IF EXISTS "BudgetMaterialTables_budgetId_idx" RENAME TO "BudgetItemTables_budgetId_idx";

-- ============================================
-- STEP 3: Rename columns in Budgets table
-- ============================================

-- Rename visibility columns
ALTER TABLE "Budgets" RENAME COLUMN "showTextBlocks" TO "showCompositeBlocks";
ALTER TABLE "Budgets" RENAME COLUMN "showMaterials" TO "showItemTables";
ALTER TABLE "Budgets" RENAME COLUMN "materialsSectionTitle" TO "itemTablesSectionTitle";

-- Update sectionOrder array values
UPDATE "Budgets"
SET "sectionOrder" = array_replace("sectionOrder", 'textBlocks', 'compositeBlocks');

UPDATE "Budgets"
SET "sectionOrder" = array_replace("sectionOrder", 'materials', 'itemTables');

-- ============================================
-- NOTES
-- ============================================
-- All foreign key constraints are automatically updated by PostgreSQL when renaming tables.
-- The CASCADE rules remain intact.
-- Application code must be updated to use the new table and column names.
