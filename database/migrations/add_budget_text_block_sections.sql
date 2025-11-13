-- ============================================
-- Migración: Crear tabla BudgetTextBlockSections
-- Fecha: 2025-11-13
-- Descripción: Separar las secciones de descripción en una tabla relacional 1:N
-- ============================================

-- 1. Crear la nueva tabla para las secciones
CREATE TABLE "BudgetTextBlockSections" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "textBlockId" UUID NOT NULL REFERENCES "BudgetTextBlocks"("id") ON DELETE CASCADE,
  "orderIndex" INTEGER NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "text" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para mejor rendimiento
CREATE INDEX "idx_BudgetTextBlockSections_textBlockId" 
  ON "BudgetTextBlockSections"("textBlockId");

CREATE INDEX "idx_BudgetTextBlockSections_order" 
  ON "BudgetTextBlockSections"("textBlockId", "orderIndex");

-- 3. Modificar la tabla BudgetTextBlocks
-- Eliminar el campo content JSONB (ya no es necesario)
ALTER TABLE "BudgetTextBlocks" DROP COLUMN IF EXISTS "content";

-- Añadir campo updatedAt si no existe
ALTER TABLE "BudgetTextBlocks" 
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Función para actualizar automáticamente updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Triggers para actualizar automáticamente updatedAt
DROP TRIGGER IF EXISTS update_BudgetTextBlocks_updated_at ON "BudgetTextBlocks";
CREATE TRIGGER update_BudgetTextBlocks_updated_at
  BEFORE UPDATE ON "BudgetTextBlocks"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_BudgetTextBlockSections_updated_at ON "BudgetTextBlockSections";
CREATE TRIGGER update_BudgetTextBlockSections_updated_at
  BEFORE UPDATE ON "BudgetTextBlockSections"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Comentarios descriptivos
COMMENT ON TABLE "BudgetTextBlockSections" IS 'Secciones de descripción de los bloques de texto del presupuesto';
COMMENT ON COLUMN "BudgetTextBlockSections"."textBlockId" IS 'Referencia al bloque de texto padre';
COMMENT ON COLUMN "BudgetTextBlockSections"."orderIndex" IS 'Orden de visualización de la sección';
COMMENT ON COLUMN "BudgetTextBlockSections"."title" IS 'Título de la sección (ej: "NUESTRAS COCINAS")';
COMMENT ON COLUMN "BudgetTextBlockSections"."text" IS 'Contenido descriptivo de la sección';
