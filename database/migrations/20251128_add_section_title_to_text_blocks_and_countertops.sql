-- Migración: Añadir columna sectionTitle a BudgetTextBlocks y BudgetCountertops
-- Fecha: 2025-11-28
-- Descripción: Permite que el cliente personalice el título de la sección
-- de mobiliario (BudgetTextBlocks) y encimera (BudgetCountertops)

-- ============================================
-- Añadir columna sectionTitle a BudgetTextBlocks
-- ============================================
ALTER TABLE "BudgetTextBlocks"
  ADD COLUMN IF NOT EXISTS "sectionTitle" VARCHAR(255) DEFAULT 'Mobiliario';

COMMENT ON COLUMN "BudgetTextBlocks"."sectionTitle" IS 'Título personalizable de la sección de bloques de texto';

-- ============================================
-- Añadir columna sectionTitle a BudgetCountertops
-- ============================================
ALTER TABLE "BudgetCountertops"
  ADD COLUMN IF NOT EXISTS "sectionTitle" VARCHAR(255) DEFAULT 'Encimera';

COMMENT ON COLUMN "BudgetCountertops"."sectionTitle" IS 'Título personalizable de la sección de encimera';
