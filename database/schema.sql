-- =============================================================================
-- EASY BUDGETS - DATABASE SCHEMA
-- =============================================================================
-- Este archivo contiene el esquema completo de la base de datos de Supabase
-- Actualizado: 2024-12-09
-- Fuente: supabase/migrations/20251201220651_initial_schema.sql
--         + 20251209174703_rename_textblocks_to_compositeblocks_and_materials_to_items.sql
-- =============================================================================

-- ENUMS
-- =============================================================================

-- Tipos de línea adicional en presupuesto
CREATE TYPE "BudgetAdditionalLineType" AS ENUM ('adjustment', 'discount', 'surcharge', 'tax');

-- Estados de un presupuesto
CREATE TYPE "BudgetStatus" AS ENUM ('not_completed', 'draft', 'pending', 'approved', 'rejected');

-- FUNCTIONS
-- =============================================================================

-- Función para actualizar updatedAt automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- TABLES
-- =============================================================================

-- Tabla: Customers
CREATE TABLE "Customers" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "name" character varying NOT NULL,
  "email" character varying,
  "phone" character varying,
  "address" text,
  "city" character varying,
  "postalCode" character varying,
  "notes" text,
  "dni" character varying UNIQUE,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "Customers_pkey" PRIMARY KEY ("id")
);

-- Tabla: Budgets
CREATE TABLE "Budgets" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "budgetNumber" character varying NOT NULL UNIQUE,
  "title" character varying NOT NULL,
  "status" "BudgetStatus" DEFAULT 'not_completed'::"BudgetStatus",
  "taxableBase" numeric NOT NULL DEFAULT 0,
  "taxPercentage" numeric DEFAULT 21.00,
  "taxAmount" numeric NOT NULL DEFAULT 0,
  "total" numeric NOT NULL DEFAULT 0,
  "validUntil" date,
  "notes" text,
  "pdfUrl" text,
  "customerId" bigint,
  "showCompositeBlocks" boolean DEFAULT true,
  "showItemTables" boolean DEFAULT true,
  "showSimpleBlock" boolean DEFAULT false,
  "showConditions" boolean DEFAULT true,
  "showSummary" boolean DEFAULT true,
  "showSignature" boolean DEFAULT true,
  "itemTablesSectionTitle" character varying DEFAULT 'Materiales y equipamiento'::character varying,
  "conditionsTitle" character varying DEFAULT 'Condiciones generales'::character varying,
  "companyLogoUrl" text,
  "supplierLogoUrl" text,
  "sectionOrder" text[] DEFAULT ARRAY['simpleBlock'::text, 'compositeBlocks'::text, 'itemTables'::text, 'summary'::text, 'conditions'::text, 'signature'::text],
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "Budgets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Budgets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE SET NULL
);

-- Tabla: BudgetAdditionalLines
CREATE TABLE "BudgetAdditionalLines" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "budgetId" bigint NOT NULL,
  "concept" character varying NOT NULL,
  "amount" numeric NOT NULL,
  "conceptType" "BudgetAdditionalLineType" NOT NULL DEFAULT 'adjustment'::"BudgetAdditionalLineType",
  "orderIndex" integer NOT NULL,
  "validUntil" date,
  "createdAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "BudgetAdditionalLines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetAdditionalLines_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE
);

-- Tabla: BudgetConditions
CREATE TABLE "BudgetConditions" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "budgetId" bigint NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "orderIndex" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "BudgetConditions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetConditions_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE
);

-- Tabla: BudgetItemTables (antes BudgetMaterialTables)
-- Tablas genéricas de elementos: materiales, iluminación, electrónicos, etc.
CREATE TABLE "BudgetItemTables" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "budgetId" bigint NOT NULL,
  "title" character varying NOT NULL DEFAULT ''::character varying,
  "orderIndex" integer NOT NULL DEFAULT 0,
  "showReference" boolean NOT NULL DEFAULT true,
  "showDescription" boolean NOT NULL DEFAULT true,
  "showManufacturer" boolean NOT NULL DEFAULT true,
  "showQuantity" boolean NOT NULL DEFAULT true,
  "showUnitPrice" boolean NOT NULL DEFAULT true,
  "showTotalPrice" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "BudgetItemTables_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetItemTables_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE
);

-- Tabla: Products
CREATE TABLE "Products" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "reference" character varying NOT NULL UNIQUE,
  "description" text NOT NULL,
  "manufacturer" character varying,
  "unitPrice" numeric NOT NULL CHECK ("unitPrice" >= 0::numeric),
  "category" character varying,
  "imageUrl" text,
  "link" text,
  "isActive" boolean DEFAULT true,
  "vatRate" numeric NOT NULL DEFAULT 21,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "Products_pkey" PRIMARY KEY ("id")
);

-- Tabla: BudgetItemTableRows (antes BudgetMaterialTableRows)
CREATE TABLE "BudgetItemTableRows" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "tableId" bigint NOT NULL,
  "productId" bigint,
  "reference" character varying,
  "description" text NOT NULL DEFAULT ''::text,
  "manufacturer" character varying,
  "quantity" numeric NOT NULL DEFAULT 0,
  "unitPrice" numeric NOT NULL DEFAULT 0,
  "totalPrice" numeric NOT NULL DEFAULT 0,
  "orderIndex" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "BudgetItemTableRows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetItemTableRows_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "BudgetItemTables"("id") ON DELETE CASCADE,
  CONSTRAINT "BudgetItemTableRows_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE SET NULL
);

-- Tabla: BudgetSimpleBlocks
CREATE TABLE "BudgetSimpleBlocks" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "budgetId" bigint NOT NULL,
  "sectionTitle" character varying DEFAULT 'Bloque Simple'::character varying,
  "model" text NOT NULL DEFAULT ''::text,
  "description" text NOT NULL DEFAULT ''::text,
  "price" numeric NOT NULL DEFAULT 0,
  "imageUrl" text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "BudgetSimpleBlocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetSimpleBlocks_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE
);

-- Tabla: BudgetCompositeBlocks (antes BudgetTextBlocks)
-- Bloques compuestos con múltiples secciones de texto
CREATE TABLE "BudgetCompositeBlocks" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "budgetId" bigint NOT NULL,
  "sectionTitle" character varying DEFAULT 'Bloque Compuesto'::character varying,
  "orderIndex" integer NOT NULL,
  "heading" character varying,
  "link" text,
  "imageUrl" text,
  "subtotal" numeric DEFAULT 0,
  "supplier" text,
  "supplierLogoUrl" text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "BudgetCompositeBlocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetCompositeBlocks_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE
);

-- Tabla: BudgetCompositeBlockSections (antes BudgetTextBlockSections)
CREATE TABLE "BudgetCompositeBlockSections" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "compositeBlockId" bigint NOT NULL,
  "title" character varying NOT NULL,
  "text" text,
  "orderIndex" integer NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "BudgetCompositeBlockSections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetCompositeBlockSections_compositeBlockId_fkey" FOREIGN KEY ("compositeBlockId") REFERENCES "BudgetCompositeBlocks"("id") ON DELETE CASCADE
);

-- Tabla: ConditionTemplates
CREATE TABLE "ConditionTemplates" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "name" text NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "ConditionTemplates_pkey" PRIMARY KEY ("id")
);

-- Tabla: ConditionTemplateSections
CREATE TABLE "ConditionTemplateSections" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "templateId" bigint NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "orderIndex" integer NOT NULL DEFAULT 0,
  CONSTRAINT "ConditionTemplateSections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConditionTemplateSections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ConditionTemplates"("id") ON DELETE CASCADE
);

-- Tabla: CompositeBlockTemplates (antes TextBlockTemplates)
CREATE TABLE "CompositeBlockTemplates" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "name" character varying NOT NULL,
  "provider" character varying,
  "heading" character varying,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "CompositeBlockTemplates_pkey" PRIMARY KEY ("id")
);

-- Tabla: CompositeBlockTemplateSections (antes TextBlockTemplateSections)
CREATE TABLE "CompositeBlockTemplateSections" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "templateId" bigint NOT NULL,
  "title" character varying NOT NULL,
  "content" text,
  "orderIndex" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "CompositeBlockTemplateSections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompositeBlockTemplateSections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CompositeBlockTemplates"("id") ON DELETE CASCADE
);

-- TRIGGERS
-- =============================================================================

CREATE TRIGGER "update_Customers_updatedAt"
  BEFORE UPDATE ON "Customers"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "update_Budgets_updatedAt"
  BEFORE UPDATE ON "Budgets"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "update_Products_updatedAt"
  BEFORE UPDATE ON "Products"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "update_BudgetSimpleBlocks_updatedAt"
  BEFORE UPDATE ON "BudgetSimpleBlocks"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- INDEXES
-- =============================================================================

CREATE INDEX "Budgets_customerId_idx" ON "Budgets"("customerId");
CREATE INDEX "BudgetConditions_budgetId_idx" ON "BudgetConditions"("budgetId");
CREATE INDEX "BudgetItemTables_budgetId_idx" ON "BudgetItemTables"("budgetId");
CREATE INDEX "BudgetCompositeBlocks_budgetId_idx" ON "BudgetCompositeBlocks"("budgetId");

-- NOTES
-- =============================================================================
--
-- NAMING CONVENTIONS:
-- - Table names: PascalCase (e.g., "BudgetCompositeBlocks", "Customers")
-- - Column names: camelCase (e.g., "budgetId", "createdAt", "orderIndex")
-- - Always use quoted identifiers to preserve case sensitivity in PostgreSQL
--
-- ENUMS:
-- - BudgetAdditionalLineType: 'adjustment', 'discount', 'surcharge', 'tax'
-- - BudgetStatus: 'not_completed', 'draft', 'pending', 'approved', 'rejected'
--
-- SECTION TYPES:
-- - compositeBlocks: Bloques compuestos con múltiples secciones de texto (antes textBlocks)
-- - itemTables: Tablas de elementos genéricos - materiales, iluminación, etc. (antes materials)
-- - simpleBlock: Bloque simple con modelo, descripción y precio
-- - conditions: Condiciones generales del presupuesto
-- - summary: Resumen con totales
-- - signature: Firma del presupuesto
--
-- RELATIONSHIPS:
-- - Budgets → Customers (many-to-one, optional, SET NULL on delete)
-- - BudgetAdditionalLines → Budgets (many-to-one, CASCADE on delete)
-- - BudgetConditions → Budgets (many-to-one, CASCADE on delete)
-- - BudgetItemTables → Budgets (many-to-one, CASCADE on delete)
-- - BudgetItemTableRows → BudgetItemTables (many-to-one, CASCADE on delete)
-- - BudgetItemTableRows → Products (many-to-one, optional, SET NULL on delete)
-- - BudgetSimpleBlocks → Budgets (many-to-one, CASCADE on delete)
-- - BudgetCompositeBlocks → Budgets (many-to-one, CASCADE on delete)
-- - BudgetCompositeBlockSections → BudgetCompositeBlocks (many-to-one, CASCADE on delete)
-- - ConditionTemplateSections → ConditionTemplates (many-to-one, CASCADE on delete)
-- - CompositeBlockTemplateSections → CompositeBlockTemplates (many-to-one, CASCADE on delete)
--
-- AUTO-UPDATE TRIGGERS:
-- - Customers, Budgets, Products, BudgetSimpleBlocks, BudgetCompositeBlocks,
--   BudgetCompositeBlockSections, CompositeBlockTemplates, CompositeBlockTemplateSections
--   all have triggers that auto-update "updatedAt" field on UPDATE
--
-- MIGRATION HISTORY:
-- - 20251201220651: Initial schema
-- - 20251209174703: Renamed TextBlocks -> CompositeBlocks, Materials -> Items
--

