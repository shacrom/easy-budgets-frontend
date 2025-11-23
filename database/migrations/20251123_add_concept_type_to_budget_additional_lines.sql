-- ============================================
-- Migración: Añadir tipo a BudgetAdditionalLines
-- Fecha: 2025-11-23
-- Descripción: Permite clasificar los conceptos adicionales como recargos,
-- descuentos, opcionales o notas sin importe.
-- ============================================

-- 1. Crear el tipo enumerado para los conceptos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'BudgetAdditionalLineType'
  ) THEN
    CREATE TYPE "BudgetAdditionalLineType" AS ENUM ('adjustment', 'discount', 'optional', 'note');
  END IF;
END $$;

-- 2. Añadir la nueva columna a la tabla
ALTER TABLE "BudgetAdditionalLines"
  ADD COLUMN IF NOT EXISTS "conceptType" "BudgetAdditionalLineType" NOT NULL DEFAULT 'adjustment';

-- 3. Asegurar que los registros existentes tengan un valor consistente
UPDATE "BudgetAdditionalLines"
SET "conceptType" = 'adjustment'
WHERE "conceptType" IS NULL;

-- 4. Añadir comentario descriptivo
COMMENT ON COLUMN "BudgetAdditionalLines"."conceptType" IS 'Clasificación del concepto adicional: adjustment, discount, optional o note.';
