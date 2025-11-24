-- ============================================
-- Migration: Add materialsSectionTitle to Budgets
-- Date: 2025-11-24
-- Description: Allows customizing the title of the materials section
-- ============================================

-- Add column for materials section title
ALTER TABLE "Budgets" 
ADD COLUMN IF NOT EXISTS "materialsSectionTitle" VARCHAR(255) DEFAULT 'Materiales y equipamiento';

-- Update existing records to have the default value
UPDATE "Budgets" 
SET "materialsSectionTitle" = 'Materiales y equipamiento' 
WHERE "materialsSectionTitle" IS NULL;
