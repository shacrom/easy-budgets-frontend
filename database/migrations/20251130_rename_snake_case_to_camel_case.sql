-- Migration: Rename snake_case columns to camelCase
-- Date: 2025-11-30
-- Description: Standardize column naming convention across all tables

-- ============================================
-- BudgetConditions table
-- ============================================

-- Rename budget_id to budgetId
ALTER TABLE public."BudgetConditions"
RENAME COLUMN budget_id TO "budgetId";

-- Rename order_index to orderIndex
ALTER TABLE public."BudgetConditions"
RENAME COLUMN order_index TO "orderIndex";

-- Rename created_at to createdAt
ALTER TABLE public."BudgetConditions"
RENAME COLUMN created_at TO "createdAt";

-- ============================================
-- ConditionTemplateSections table
-- ============================================

-- Rename template_id to templateId
ALTER TABLE public."ConditionTemplateSections"
RENAME COLUMN template_id TO "templateId";

-- Rename order_index to orderIndex
ALTER TABLE public."ConditionTemplateSections"
RENAME COLUMN order_index TO "orderIndex";

-- ============================================
-- ConditionTemplates table
-- ============================================

-- Rename created_at to createdAt
ALTER TABLE public."ConditionTemplates"
RENAME COLUMN created_at TO "createdAt";

-- ============================================
-- TextBlockTemplateSections table
-- ============================================

-- Rename template_id to templateId
ALTER TABLE public."TextBlockTemplateSections"
RENAME COLUMN template_id TO "templateId";

-- Rename order_index to orderIndex
ALTER TABLE public."TextBlockTemplateSections"
RENAME COLUMN order_index TO "orderIndex";

-- ============================================
-- Update indexes for TextBlockTemplateSections
-- ============================================

-- Drop old indexes
DROP INDEX IF EXISTS public."idx_TextBlockTemplateSections_templateId";
DROP INDEX IF EXISTS public."idx_TextBlockTemplateSections_order";

-- Create new indexes with updated column names
CREATE INDEX IF NOT EXISTS "idx_TextBlockTemplateSections_templateId"
ON public."TextBlockTemplateSections" USING btree ("templateId");

CREATE INDEX IF NOT EXISTS "idx_TextBlockTemplateSections_order"
ON public."TextBlockTemplateSections" USING btree ("templateId", "orderIndex");
