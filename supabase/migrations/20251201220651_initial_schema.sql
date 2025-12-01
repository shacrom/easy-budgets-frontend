-- Crear tipos ENUM solo si no existen
DO $$ BEGIN
  CREATE TYPE "BudgetAdditionalLineType" AS ENUM ('adjustment', 'discount', 'surcharge', 'tax');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BudgetStatus" AS ENUM ('not_completed', 'draft', 'pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Función para actualizar updatedAt automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabla: Customers
CREATE TABLE IF NOT EXISTS "Customers" (
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

-- Trigger para Customers
DROP TRIGGER IF EXISTS "update_Customers_updatedAt" ON "Customers";
CREATE TRIGGER "update_Customers_updatedAt"
  BEFORE UPDATE ON "Customers"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabla: Budgets
CREATE TABLE IF NOT EXISTS "Budgets" (
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
  "showTextBlocks" boolean DEFAULT true,
  "showMaterials" boolean DEFAULT true,
  "showSimpleBlock" boolean DEFAULT false,
  "showConditions" boolean DEFAULT true,
  "showSummary" boolean DEFAULT true,
  "showSignature" boolean DEFAULT true,
  "materialsSectionTitle" character varying DEFAULT 'Materiales y equipamiento'::character varying,
  "conditionsTitle" character varying DEFAULT 'Condiciones generales'::character varying,
  "companyLogoUrl" text,
  "supplierLogoUrl" text,
  "sectionOrder" text[] DEFAULT ARRAY['simpleBlock'::text, 'textBlocks'::text, 'materials'::text, 'summary'::text, 'conditions'::text, 'signature'::text],
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "Budgets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Budgets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE SET NULL
);

-- Trigger para Budgets
DROP TRIGGER IF EXISTS "update_Budgets_updatedAt" ON "Budgets";
CREATE TRIGGER "update_Budgets_updatedAt"
  BEFORE UPDATE ON "Budgets"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabla: BudgetAdditionalLines
CREATE TABLE IF NOT EXISTS "BudgetAdditionalLines" (
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
CREATE TABLE IF NOT EXISTS "BudgetConditions" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "budgetId" bigint NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "orderIndex" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "BudgetConditions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetConditions_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE
);

-- Tabla: BudgetMaterialTables
CREATE TABLE IF NOT EXISTS "BudgetMaterialTables" (
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
  CONSTRAINT "BudgetMaterialTables_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetMaterialTables_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE
);

-- Tabla: Products
CREATE TABLE IF NOT EXISTS "Products" (
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

-- Trigger para Products
DROP TRIGGER IF EXISTS "update_Products_updatedAt" ON "Products";
CREATE TRIGGER "update_Products_updatedAt"
  BEFORE UPDATE ON "Products"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabla: BudgetMaterialTableRows
CREATE TABLE IF NOT EXISTS "BudgetMaterialTableRows" (
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
  CONSTRAINT "BudgetMaterialTableRows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetMaterialTableRows_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "BudgetMaterialTables"("id") ON DELETE CASCADE,
  CONSTRAINT "BudgetMaterialTableRows_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE SET NULL
);

-- Tabla: BudgetSimpleBlocks
CREATE TABLE IF NOT EXISTS "BudgetSimpleBlocks" (
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

-- Trigger para BudgetSimpleBlocks
DROP TRIGGER IF EXISTS "update_BudgetSimpleBlocks_updatedAt" ON "BudgetSimpleBlocks";
CREATE TRIGGER "update_BudgetSimpleBlocks_updatedAt"
  BEFORE UPDATE ON "BudgetSimpleBlocks"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabla: BudgetTextBlocks
CREATE TABLE IF NOT EXISTS "BudgetTextBlocks" (
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
  CONSTRAINT "BudgetTextBlocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetTextBlocks_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE
);

-- Trigger para BudgetTextBlocks
DROP TRIGGER IF EXISTS "update_BudgetTextBlocks_updatedAt" ON "BudgetTextBlocks";
CREATE TRIGGER "update_BudgetTextBlocks_updatedAt"
  BEFORE UPDATE ON "BudgetTextBlocks"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabla: BudgetTextBlockSections
CREATE TABLE IF NOT EXISTS "BudgetTextBlockSections" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "textBlockId" bigint NOT NULL,
  "title" character varying NOT NULL,
  "text" text,
  "orderIndex" integer NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "BudgetTextBlockSections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetTextBlockSections_textBlockId_fkey" FOREIGN KEY ("textBlockId") REFERENCES "BudgetTextBlocks"("id") ON DELETE CASCADE
);

-- Trigger para BudgetTextBlockSections
DROP TRIGGER IF EXISTS "update_BudgetTextBlockSections_updatedAt" ON "BudgetTextBlockSections";
CREATE TRIGGER "update_BudgetTextBlockSections_updatedAt"
  BEFORE UPDATE ON "BudgetTextBlockSections"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabla: ConditionTemplates
CREATE TABLE IF NOT EXISTS "ConditionTemplates" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "name" text NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "ConditionTemplates_pkey" PRIMARY KEY ("id")
);

-- Tabla: ConditionTemplateSections
CREATE TABLE IF NOT EXISTS "ConditionTemplateSections" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "templateId" bigint NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "orderIndex" integer NOT NULL DEFAULT 0,
  CONSTRAINT "ConditionTemplateSections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConditionTemplateSections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ConditionTemplates"("id") ON DELETE CASCADE
);

-- Tabla: TextBlockTemplates
CREATE TABLE IF NOT EXISTS "TextBlockTemplates" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "name" character varying NOT NULL,
  "provider" character varying,
  "heading" character varying,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "TextBlockTemplates_pkey" PRIMARY KEY ("id")
);

-- Trigger para TextBlockTemplates
DROP TRIGGER IF EXISTS "update_TextBlockTemplates_updatedAt" ON "TextBlockTemplates";
CREATE TRIGGER "update_TextBlockTemplates_updatedAt"
  BEFORE UPDATE ON "TextBlockTemplates"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabla: TextBlockTemplateSections
CREATE TABLE IF NOT EXISTS "TextBlockTemplateSections" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "templateId" bigint NOT NULL,
  "title" character varying NOT NULL,
  "content" text,
  "orderIndex" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "TextBlockTemplateSections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TextBlockTemplateSections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TextBlockTemplates"("id") ON DELETE CASCADE
);

-- Trigger para TextBlockTemplateSections
DROP TRIGGER IF EXISTS "update_TextBlockTemplateSections_updatedAt" ON "TextBlockTemplateSections";
CREATE TRIGGER "update_TextBlockTemplateSections_updatedAt"
  BEFORE UPDATE ON "TextBlockTemplateSections"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS "Budgets_customerId_idx" ON "Budgets"("customerId");
CREATE INDEX IF NOT EXISTS "BudgetConditions_budgetId_idx" ON "BudgetConditions"("budgetId");
CREATE INDEX IF NOT EXISTS "BudgetMaterialTables_budgetId_idx" ON "BudgetMaterialTables"("budgetId");
CREATE INDEX IF NOT EXISTS "BudgetTextBlocks_budgetId_idx" ON "BudgetTextBlocks"("budgetId");
