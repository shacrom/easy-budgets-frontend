-- ============================================
-- Migración: Convertir UUIDs a BIGINT autoincremental
-- Fecha: 2025-11-25
-- Descripción: Reemplaza todas las columnas UUID por BIGINT GENERATED ALWAYS AS IDENTITY
--              en todas las tablas del esquema, manteniendo relaciones e integridad referencial.
-- ============================================

-- IMPORTANTE: 
-- 1. Hacer un backup completo ANTES de ejecutar esta migración
-- 2. Ejecutar en un entorno de prueba primero
-- 3. Esta migración puede tardar dependiendo del volumen de datos

BEGIN;

-- ============================================
-- PASO 1: Crear tablas temporales para mapear UUIDs antiguos a nuevos IDs
-- ============================================

-- Mapeo para Customers
CREATE TEMP TABLE _map_customers AS
SELECT 
  "id" AS old_id,
  ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS new_id
FROM "Customers";

-- Mapeo para Products
CREATE TEMP TABLE _map_products AS
SELECT 
  "id" AS old_id,
  ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS new_id
FROM "Products";

-- Mapeo para Budgets
CREATE TEMP TABLE _map_budgets AS
SELECT 
  "id" AS old_id,
  ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS new_id
FROM "Budgets";

-- Mapeo para BudgetTextBlocks
CREATE TEMP TABLE _map_text_blocks AS
SELECT 
  "id" AS old_id,
  ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS new_id
FROM "BudgetTextBlocks";

-- Mapeo para BudgetTextBlockSections
CREATE TEMP TABLE _map_text_block_sections AS
SELECT 
  "id" AS old_id,
  ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS new_id
FROM "BudgetTextBlockSections";

-- Mapeo para BudgetMaterialTables
CREATE TEMP TABLE _map_material_tables AS
SELECT 
  "id" AS old_id,
  ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS new_id
FROM "BudgetMaterialTables";

-- Mapeo para BudgetMaterialTableRows
CREATE TEMP TABLE _map_material_rows AS
SELECT 
  "id" AS old_id,
  ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS new_id
FROM "BudgetMaterialTableRows";

-- Mapeo para BudgetCountertops
CREATE TEMP TABLE _map_countertops AS
SELECT 
  "id" AS old_id,
  ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS new_id
FROM "BudgetCountertops";

-- Mapeo para BudgetAdditionalLines (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BudgetAdditionalLines') THEN
    CREATE TEMP TABLE _map_additional_lines AS
    SELECT 
      "id" AS old_id,
      ROW_NUMBER() OVER (ORDER BY "id") AS new_id
    FROM "BudgetAdditionalLines";
  END IF;
END $$;

-- ============================================
-- PASO 2: Eliminar constraints de foreign keys
-- ============================================

-- Budgets -> Customers
ALTER TABLE "Budgets" DROP CONSTRAINT IF EXISTS "Budgets_customerId_fkey";

-- BudgetTextBlocks -> Budgets
ALTER TABLE "BudgetTextBlocks" DROP CONSTRAINT IF EXISTS "BudgetTextBlocks_budgetId_fkey";

-- BudgetTextBlockSections -> BudgetTextBlocks
ALTER TABLE "BudgetTextBlockSections" DROP CONSTRAINT IF EXISTS "BudgetTextBlockSections_textBlockId_fkey";

-- BudgetMaterialTables -> Budgets
ALTER TABLE "BudgetMaterialTables" DROP CONSTRAINT IF EXISTS "BudgetMaterialTables_budgetId_fkey";

-- BudgetMaterialTableRows -> BudgetMaterialTables
ALTER TABLE "BudgetMaterialTableRows" DROP CONSTRAINT IF EXISTS "BudgetMaterialTableRows_tableId_fkey";

-- BudgetMaterialTableRows -> Products
ALTER TABLE "BudgetMaterialTableRows" DROP CONSTRAINT IF EXISTS "BudgetMaterialTableRows_productId_fkey";

-- BudgetCountertops -> Budgets
ALTER TABLE "BudgetCountertops" DROP CONSTRAINT IF EXISTS "BudgetCountertops_budgetId_fkey";

-- BudgetAdditionalLines -> Budgets (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BudgetAdditionalLines') THEN
    ALTER TABLE "BudgetAdditionalLines" DROP CONSTRAINT IF EXISTS "BudgetAdditionalLines_budgetId_fkey";
  END IF;
END $$;

-- ============================================
-- PASO 3: Añadir columnas BIGINT temporales
-- ============================================

-- Customers
ALTER TABLE "Customers" ADD COLUMN "new_id" BIGINT;
UPDATE "Customers" c SET "new_id" = m.new_id FROM _map_customers m WHERE c."id" = m.old_id;

-- Products
ALTER TABLE "Products" ADD COLUMN "new_id" BIGINT;
UPDATE "Products" p SET "new_id" = m.new_id FROM _map_products m WHERE p."id" = m.old_id;

-- Budgets
ALTER TABLE "Budgets" ADD COLUMN "new_id" BIGINT;
ALTER TABLE "Budgets" ADD COLUMN "new_customerId" BIGINT;
-- Primero actualizamos el new_id
UPDATE "Budgets" b 
SET "new_id" = mb.new_id
FROM _map_budgets mb
WHERE b."id" = mb.old_id;
-- Luego actualizamos el new_customerId
UPDATE "Budgets" b 
SET "new_customerId" = mc.new_id
FROM _map_customers mc
WHERE b."customerId" = mc.old_id;

-- BudgetTextBlocks
ALTER TABLE "BudgetTextBlocks" ADD COLUMN "new_id" BIGINT;
ALTER TABLE "BudgetTextBlocks" ADD COLUMN "new_budgetId" BIGINT;
-- Primero actualizamos el new_id
UPDATE "BudgetTextBlocks" tb
SET "new_id" = mtb.new_id
FROM _map_text_blocks mtb
WHERE tb."id" = mtb.old_id;
-- Luego actualizamos el new_budgetId
UPDATE "BudgetTextBlocks" tb
SET "new_budgetId" = mb.new_id
FROM _map_budgets mb
WHERE tb."budgetId" = mb.old_id;

-- BudgetTextBlockSections
ALTER TABLE "BudgetTextBlockSections" ADD COLUMN "new_id" BIGINT;
ALTER TABLE "BudgetTextBlockSections" ADD COLUMN "new_textBlockId" BIGINT;
-- Primero actualizamos el new_id
UPDATE "BudgetTextBlockSections" tbs
SET "new_id" = ms.new_id
FROM _map_text_block_sections ms
WHERE tbs."id" = ms.old_id;
-- Luego actualizamos el new_textBlockId
UPDATE "BudgetTextBlockSections" tbs
SET "new_textBlockId" = mtb.new_id
FROM _map_text_blocks mtb
WHERE tbs."textBlockId" = mtb.old_id;

-- BudgetMaterialTables
ALTER TABLE "BudgetMaterialTables" ADD COLUMN "new_id" BIGINT;
ALTER TABLE "BudgetMaterialTables" ADD COLUMN "new_budgetId" BIGINT;
-- Primero actualizamos el new_id
UPDATE "BudgetMaterialTables" mt
SET "new_id" = mmt.new_id
FROM _map_material_tables mmt
WHERE mt."id" = mmt.old_id;
-- Luego actualizamos el new_budgetId
UPDATE "BudgetMaterialTables" mt
SET "new_budgetId" = mb.new_id
FROM _map_budgets mb
WHERE mt."budgetId" = mb.old_id;

-- BudgetMaterialTableRows
ALTER TABLE "BudgetMaterialTableRows" ADD COLUMN "new_id" BIGINT;
ALTER TABLE "BudgetMaterialTableRows" ADD COLUMN "new_tableId" BIGINT;
ALTER TABLE "BudgetMaterialTableRows" ADD COLUMN "new_productId" BIGINT;
-- Primero actualizamos el new_id
UPDATE "BudgetMaterialTableRows" mr
SET "new_id" = mmr.new_id
FROM _map_material_rows mmr
WHERE mr."id" = mmr.old_id;
-- Luego actualizamos el new_tableId
UPDATE "BudgetMaterialTableRows" mr
SET "new_tableId" = mmt.new_id
FROM _map_material_tables mmt
WHERE mr."tableId" = mmt.old_id;
-- Finalmente actualizamos el new_productId
UPDATE "BudgetMaterialTableRows" mr
SET "new_productId" = mp.new_id
FROM _map_products mp
WHERE mr."productId" = mp.old_id;

-- BudgetCountertops
ALTER TABLE "BudgetCountertops" ADD COLUMN "new_id" BIGINT;
ALTER TABLE "BudgetCountertops" ADD COLUMN "new_budgetId" BIGINT;
-- Primero actualizamos el new_id
UPDATE "BudgetCountertops" ct
SET "new_id" = mct.new_id
FROM _map_countertops mct
WHERE ct."id" = mct.old_id;
-- Luego actualizamos el new_budgetId
UPDATE "BudgetCountertops" ct
SET "new_budgetId" = mb.new_id
FROM _map_budgets mb
WHERE ct."budgetId" = mb.old_id;

-- BudgetAdditionalLines (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BudgetAdditionalLines') THEN
    EXECUTE 'ALTER TABLE "BudgetAdditionalLines" ADD COLUMN "new_id" BIGINT';
    EXECUTE 'ALTER TABLE "BudgetAdditionalLines" ADD COLUMN "new_budgetId" BIGINT';
    EXECUTE 'UPDATE "BudgetAdditionalLines" al SET "new_id" = mal.new_id FROM _map_additional_lines mal WHERE al."id" = mal.old_id';
    EXECUTE 'UPDATE "BudgetAdditionalLines" al SET "new_budgetId" = mb.new_id FROM _map_budgets mb WHERE al."budgetId" = mb.old_id';
  END IF;
END $$;

-- ============================================
-- PASO 4: Eliminar columnas UUID antiguas y renombrar las nuevas
-- ============================================

-- Customers
ALTER TABLE "Customers" DROP COLUMN "id";
ALTER TABLE "Customers" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "Customers" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "Customers" ADD PRIMARY KEY ("id");

-- Products
ALTER TABLE "Products" DROP COLUMN "id";
ALTER TABLE "Products" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "Products" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "Products" ADD PRIMARY KEY ("id");

-- Budgets
ALTER TABLE "Budgets" DROP COLUMN "id";
ALTER TABLE "Budgets" DROP COLUMN "customerId";
ALTER TABLE "Budgets" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "Budgets" RENAME COLUMN "new_customerId" TO "customerId";
ALTER TABLE "Budgets" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "Budgets" ADD PRIMARY KEY ("id");

-- BudgetTextBlocks
ALTER TABLE "BudgetTextBlocks" DROP COLUMN "id";
ALTER TABLE "BudgetTextBlocks" DROP COLUMN "budgetId";
ALTER TABLE "BudgetTextBlocks" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "BudgetTextBlocks" RENAME COLUMN "new_budgetId" TO "budgetId";
ALTER TABLE "BudgetTextBlocks" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "BudgetTextBlocks" ALTER COLUMN "budgetId" SET NOT NULL;
ALTER TABLE "BudgetTextBlocks" ADD PRIMARY KEY ("id");

-- BudgetTextBlockSections
ALTER TABLE "BudgetTextBlockSections" DROP COLUMN "id";
ALTER TABLE "BudgetTextBlockSections" DROP COLUMN "textBlockId";
ALTER TABLE "BudgetTextBlockSections" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "BudgetTextBlockSections" RENAME COLUMN "new_textBlockId" TO "textBlockId";
ALTER TABLE "BudgetTextBlockSections" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "BudgetTextBlockSections" ALTER COLUMN "textBlockId" SET NOT NULL;
ALTER TABLE "BudgetTextBlockSections" ADD PRIMARY KEY ("id");

-- BudgetMaterialTables
ALTER TABLE "BudgetMaterialTables" DROP COLUMN "id";
ALTER TABLE "BudgetMaterialTables" DROP COLUMN "budgetId";
ALTER TABLE "BudgetMaterialTables" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "BudgetMaterialTables" RENAME COLUMN "new_budgetId" TO "budgetId";
ALTER TABLE "BudgetMaterialTables" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "BudgetMaterialTables" ALTER COLUMN "budgetId" SET NOT NULL;
ALTER TABLE "BudgetMaterialTables" ADD PRIMARY KEY ("id");

-- BudgetMaterialTableRows
ALTER TABLE "BudgetMaterialTableRows" DROP COLUMN "id";
ALTER TABLE "BudgetMaterialTableRows" DROP COLUMN "tableId";
ALTER TABLE "BudgetMaterialTableRows" DROP COLUMN "productId";
ALTER TABLE "BudgetMaterialTableRows" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "BudgetMaterialTableRows" RENAME COLUMN "new_tableId" TO "tableId";
ALTER TABLE "BudgetMaterialTableRows" RENAME COLUMN "new_productId" TO "productId";
ALTER TABLE "BudgetMaterialTableRows" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "BudgetMaterialTableRows" ALTER COLUMN "tableId" SET NOT NULL;
ALTER TABLE "BudgetMaterialTableRows" ADD PRIMARY KEY ("id");

-- BudgetCountertops
ALTER TABLE "BudgetCountertops" DROP COLUMN "id";
ALTER TABLE "BudgetCountertops" DROP COLUMN "budgetId";
ALTER TABLE "BudgetCountertops" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "BudgetCountertops" RENAME COLUMN "new_budgetId" TO "budgetId";
ALTER TABLE "BudgetCountertops" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "BudgetCountertops" ALTER COLUMN "budgetId" SET NOT NULL;
ALTER TABLE "BudgetCountertops" ADD PRIMARY KEY ("id");

-- BudgetAdditionalLines (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BudgetAdditionalLines') THEN
    EXECUTE '
      ALTER TABLE "BudgetAdditionalLines" DROP COLUMN "id";
      ALTER TABLE "BudgetAdditionalLines" DROP COLUMN "budgetId";
      ALTER TABLE "BudgetAdditionalLines" RENAME COLUMN "new_id" TO "id";
      ALTER TABLE "BudgetAdditionalLines" RENAME COLUMN "new_budgetId" TO "budgetId";
      ALTER TABLE "BudgetAdditionalLines" ALTER COLUMN "id" SET NOT NULL;
      ALTER TABLE "BudgetAdditionalLines" ALTER COLUMN "budgetId" SET NOT NULL;
      ALTER TABLE "BudgetAdditionalLines" ADD PRIMARY KEY ("id");
    ';
  END IF;
END $$;

-- ============================================
-- PASO 5: Crear secuencias y configurar IDENTITY
-- ============================================

-- Customers
CREATE SEQUENCE IF NOT EXISTS "Customers_id_seq" OWNED BY "Customers"."id";
SELECT setval('"Customers_id_seq"', COALESCE((SELECT MAX("id") FROM "Customers"), 0) + 1, false);
ALTER TABLE "Customers" ALTER COLUMN "id" SET DEFAULT nextval('"Customers_id_seq"');

-- Products
CREATE SEQUENCE IF NOT EXISTS "Products_id_seq" OWNED BY "Products"."id";
SELECT setval('"Products_id_seq"', COALESCE((SELECT MAX("id") FROM "Products"), 0) + 1, false);
ALTER TABLE "Products" ALTER COLUMN "id" SET DEFAULT nextval('"Products_id_seq"');

-- Budgets
CREATE SEQUENCE IF NOT EXISTS "Budgets_id_seq" OWNED BY "Budgets"."id";
SELECT setval('"Budgets_id_seq"', COALESCE((SELECT MAX("id") FROM "Budgets"), 0) + 1, false);
ALTER TABLE "Budgets" ALTER COLUMN "id" SET DEFAULT nextval('"Budgets_id_seq"');

-- BudgetTextBlocks
CREATE SEQUENCE IF NOT EXISTS "BudgetTextBlocks_id_seq" OWNED BY "BudgetTextBlocks"."id";
SELECT setval('"BudgetTextBlocks_id_seq"', COALESCE((SELECT MAX("id") FROM "BudgetTextBlocks"), 0) + 1, false);
ALTER TABLE "BudgetTextBlocks" ALTER COLUMN "id" SET DEFAULT nextval('"BudgetTextBlocks_id_seq"');

-- BudgetTextBlockSections
CREATE SEQUENCE IF NOT EXISTS "BudgetTextBlockSections_id_seq" OWNED BY "BudgetTextBlockSections"."id";
SELECT setval('"BudgetTextBlockSections_id_seq"', COALESCE((SELECT MAX("id") FROM "BudgetTextBlockSections"), 0) + 1, false);
ALTER TABLE "BudgetTextBlockSections" ALTER COLUMN "id" SET DEFAULT nextval('"BudgetTextBlockSections_id_seq"');

-- BudgetMaterialTables
CREATE SEQUENCE IF NOT EXISTS "BudgetMaterialTables_id_seq" OWNED BY "BudgetMaterialTables"."id";
SELECT setval('"BudgetMaterialTables_id_seq"', COALESCE((SELECT MAX("id") FROM "BudgetMaterialTables"), 0) + 1, false);
ALTER TABLE "BudgetMaterialTables" ALTER COLUMN "id" SET DEFAULT nextval('"BudgetMaterialTables_id_seq"');

-- BudgetMaterialTableRows
CREATE SEQUENCE IF NOT EXISTS "BudgetMaterialTableRows_id_seq" OWNED BY "BudgetMaterialTableRows"."id";
SELECT setval('"BudgetMaterialTableRows_id_seq"', COALESCE((SELECT MAX("id") FROM "BudgetMaterialTableRows"), 0) + 1, false);
ALTER TABLE "BudgetMaterialTableRows" ALTER COLUMN "id" SET DEFAULT nextval('"BudgetMaterialTableRows_id_seq"');

-- BudgetCountertops
CREATE SEQUENCE IF NOT EXISTS "BudgetCountertops_id_seq" OWNED BY "BudgetCountertops"."id";
SELECT setval('"BudgetCountertops_id_seq"', COALESCE((SELECT MAX("id") FROM "BudgetCountertops"), 0) + 1, false);
ALTER TABLE "BudgetCountertops" ALTER COLUMN "id" SET DEFAULT nextval('"BudgetCountertops_id_seq"');

-- BudgetAdditionalLines (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BudgetAdditionalLines') THEN
    EXECUTE '
      CREATE SEQUENCE IF NOT EXISTS "BudgetAdditionalLines_id_seq" OWNED BY "BudgetAdditionalLines"."id";
      SELECT setval(''"BudgetAdditionalLines_id_seq"'', COALESCE((SELECT MAX("id") FROM "BudgetAdditionalLines"), 0) + 1, false);
      ALTER TABLE "BudgetAdditionalLines" ALTER COLUMN "id" SET DEFAULT nextval(''"BudgetAdditionalLines_id_seq"'');
    ';
  END IF;
END $$;

-- ============================================
-- PASO 6: Restaurar foreign keys
-- ============================================

-- Budgets -> Customers
ALTER TABLE "Budgets" 
  ADD CONSTRAINT "Budgets_customerId_fkey" 
  FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE SET NULL;

-- BudgetTextBlocks -> Budgets
ALTER TABLE "BudgetTextBlocks" 
  ADD CONSTRAINT "BudgetTextBlocks_budgetId_fkey" 
  FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE;

-- BudgetTextBlockSections -> BudgetTextBlocks
ALTER TABLE "BudgetTextBlockSections" 
  ADD CONSTRAINT "BudgetTextBlockSections_textBlockId_fkey" 
  FOREIGN KEY ("textBlockId") REFERENCES "BudgetTextBlocks"("id") ON DELETE CASCADE;

-- BudgetMaterialTables -> Budgets
ALTER TABLE "BudgetMaterialTables" 
  ADD CONSTRAINT "BudgetMaterialTables_budgetId_fkey" 
  FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE;

-- BudgetMaterialTableRows -> BudgetMaterialTables
ALTER TABLE "BudgetMaterialTableRows" 
  ADD CONSTRAINT "BudgetMaterialTableRows_tableId_fkey" 
  FOREIGN KEY ("tableId") REFERENCES "BudgetMaterialTables"("id") ON DELETE CASCADE;

-- BudgetMaterialTableRows -> Products
ALTER TABLE "BudgetMaterialTableRows" 
  ADD CONSTRAINT "BudgetMaterialTableRows_productId_fkey" 
  FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE SET NULL;

-- BudgetCountertops -> Budgets
ALTER TABLE "BudgetCountertops" 
  ADD CONSTRAINT "BudgetCountertops_budgetId_fkey" 
  FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE;

-- BudgetAdditionalLines -> Budgets (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BudgetAdditionalLines') THEN
    EXECUTE '
      ALTER TABLE "BudgetAdditionalLines" 
        ADD CONSTRAINT "BudgetAdditionalLines_budgetId_fkey" 
        FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE;
    ';
  END IF;
END $$;

-- ============================================
-- PASO 7: Recrear índices
-- ============================================

-- Eliminar índices antiguos (si existen con UUID)
DROP INDEX IF EXISTS "idx_BudgetMaterialTables_budgetId";
DROP INDEX IF EXISTS "idx_BudgetMaterialTables_orderIndex";
DROP INDEX IF EXISTS "idx_BudgetMaterialTableRows_tableId";
DROP INDEX IF EXISTS "idx_BudgetMaterialTableRows_orderIndex";
DROP INDEX IF EXISTS "idx_BudgetTextBlockSections_textBlockId";
DROP INDEX IF EXISTS "idx_BudgetTextBlockSections_order";

-- Recrear índices con BIGINT
CREATE INDEX "idx_BudgetMaterialTables_budgetId" ON "BudgetMaterialTables"("budgetId");
CREATE INDEX "idx_BudgetMaterialTables_orderIndex" ON "BudgetMaterialTables"("budgetId", "orderIndex");
CREATE INDEX "idx_BudgetMaterialTableRows_tableId" ON "BudgetMaterialTableRows"("tableId");
CREATE INDEX "idx_BudgetMaterialTableRows_orderIndex" ON "BudgetMaterialTableRows"("tableId", "orderIndex");
CREATE INDEX "idx_BudgetTextBlockSections_textBlockId" ON "BudgetTextBlockSections"("textBlockId");
CREATE INDEX "idx_BudgetTextBlockSections_order" ON "BudgetTextBlockSections"("textBlockId", "orderIndex");
CREATE INDEX IF NOT EXISTS "idx_Budgets_customerId" ON "Budgets"("customerId");
CREATE INDEX IF NOT EXISTS "idx_BudgetTextBlocks_budgetId" ON "BudgetTextBlocks"("budgetId");
CREATE INDEX IF NOT EXISTS "idx_BudgetCountertops_budgetId" ON "BudgetCountertops"("budgetId");

-- ============================================
-- PASO 8: Limpiar tablas temporales
-- ============================================

DROP TABLE IF EXISTS _map_customers;
DROP TABLE IF EXISTS _map_products;
DROP TABLE IF EXISTS _map_budgets;
DROP TABLE IF EXISTS _map_text_blocks;
DROP TABLE IF EXISTS _map_text_block_sections;
DROP TABLE IF EXISTS _map_material_tables;
DROP TABLE IF EXISTS _map_material_rows;
DROP TABLE IF EXISTS _map_countertops;
DROP TABLE IF EXISTS _map_additional_lines;

COMMIT;

-- ============================================
-- VERIFICACIÓN (ejecutar después del COMMIT)
-- ============================================
-- SELECT 
--   table_name, 
--   column_name, 
--   data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND column_name IN ('id', 'budgetId', 'customerId', 'tableId', 'textBlockId', 'productId')
-- ORDER BY table_name, column_name;
