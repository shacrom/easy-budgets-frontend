-- ============================================
-- Migración: Tablas relacionales para materiales por bloque
-- Fecha: 2025-11-21
-- Descripción: Crea las tablas BudgetMaterialTables y BudgetMaterialTableRows,
--              migra los registros existentes desde BudgetMaterials y deja listo
--              el esquema para múltiples tablas de materiales por presupuesto.
-- ============================================

BEGIN;

-- Asegurarnos de tener disponible la generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla principal para los bloques de materiales
CREATE TABLE IF NOT EXISTS "BudgetMaterialTables" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "budgetId" UUID NOT NULL REFERENCES "Budgets"("id") ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL DEFAULT '',
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla hija para las filas de cada bloque
CREATE TABLE IF NOT EXISTS "BudgetMaterialTableRows" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "tableId" UUID NOT NULL REFERENCES "BudgetMaterialTables"("id") ON DELETE CASCADE,
  "productId" UUID REFERENCES "Products"("id") ON DELETE SET NULL,
  "reference" VARCHAR(100),
  "description" TEXT NOT NULL DEFAULT '',
  "manufacturer" VARCHAR(200),
  "quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "unitPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices para acelerar lecturas
CREATE INDEX IF NOT EXISTS "idx_BudgetMaterialTables_budgetId"
  ON "BudgetMaterialTables"("budgetId");

CREATE INDEX IF NOT EXISTS "idx_BudgetMaterialTables_orderIndex"
  ON "BudgetMaterialTables"("budgetId", "orderIndex");

CREATE INDEX IF NOT EXISTS "idx_BudgetMaterialTableRows_tableId"
  ON "BudgetMaterialTableRows"("tableId");

CREATE INDEX IF NOT EXISTS "idx_BudgetMaterialTableRows_orderIndex"
  ON "BudgetMaterialTableRows"("tableId", "orderIndex");

-- 4. Migración de datos legacy (solo si aún no hemos poblado las nuevas tablas)
DO $$
DECLARE
  table_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO table_count FROM "BudgetMaterialTables";

  IF table_count = 0 THEN
    WITH budgets_with_materials AS (
      SELECT DISTINCT "budgetId"
      FROM "BudgetMaterials"
      WHERE "budgetId" IS NOT NULL
    ), inserted_tables AS (
      INSERT INTO "BudgetMaterialTables" ("id", "budgetId", "title", "orderIndex")
      SELECT uuid_generate_v4(), b."budgetId", 'Materiales', 0
      FROM budgets_with_materials b
      RETURNING "id", "budgetId"
    )
    INSERT INTO "BudgetMaterialTableRows" (
      "id",
      "tableId",
      "productId",
      "reference",
      "description",
      "manufacturer",
      "quantity",
      "unitPrice",
      "totalPrice",
      "orderIndex"
    )
    SELECT
      uuid_generate_v4(),
      it."id",
      bm."productId",
      COALESCE(p."reference", ''),
      bm."description",
      bm."manufacturer",
      bm."quantity",
      bm."unitPrice",
      COALESCE(bm."totalPrice", bm."quantity" * bm."unitPrice"),
      COALESCE(bm."orderIndex", ROW_NUMBER() OVER (PARTITION BY bm."budgetId" ORDER BY bm."createdAt", bm."id") - 1)
    FROM "BudgetMaterials" bm
    JOIN inserted_tables it ON it."budgetId" = bm."budgetId"
    LEFT JOIN "Products" p ON p."id" = bm."productId";
  END IF;
END $$;

-- 5. Eliminar la tabla legacy ahora que todo está migrado
DROP TABLE IF EXISTS "BudgetMaterials" CASCADE;

COMMIT;
