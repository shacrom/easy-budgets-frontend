-- Migración: Añadir columnas showSummary y showSignature a Budgets
-- Fecha: 2025-11-28
-- Descripción: Permite controlar la visibilidad de las secciones de resumen
-- y firma tanto en el formulario como en el PDF generado.

-- ============================================
-- Añadir columna showSummary a Budgets
-- ============================================
ALTER TABLE "Budgets"
  ADD COLUMN IF NOT EXISTS "showSummary" BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN "Budgets"."showSummary" IS 'Controla si se muestra la sección de resumen de precios';

-- ============================================
-- Añadir columna showSignature a Budgets
-- ============================================
ALTER TABLE "Budgets"
  ADD COLUMN IF NOT EXISTS "showSignature" BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN "Budgets"."showSignature" IS 'Controla si se muestra la sección de firma en el PDF';

-- ============================================
-- Notas de migración
-- ============================================
-- Los valores por defecto TRUE mantienen el comportamiento actual.
-- El resumen se ocultará del formulario y del PDF si showSummary es FALSE.
-- La firma solo afecta al PDF generado.
