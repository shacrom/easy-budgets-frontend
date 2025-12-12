-- =============================================================================
-- MIGRATION: Add Supplier Orders Feature
-- =============================================================================
-- Fecha: 2024-12-12
-- Descripción: Añade las tablas necesarias para gestionar pedidos a proveedores
--              desde las tablas de ítems de los presupuestos
-- =============================================================================

-- ENUMS
-- =============================================================================

-- Estados de un pedido a proveedor
CREATE TYPE "SupplierOrderStatus" AS ENUM ('draft', 'sent', 'delivered');

-- TABLES
-- =============================================================================

-- Tabla: Suppliers (Proveedores)
CREATE TABLE "Suppliers" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "name" character varying NOT NULL,
  "email" character varying,
  "phone" character varying,
  "notes" text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "Suppliers_pkey" PRIMARY KEY ("id")
);

-- Tabla: DeliveryAddresses (Direcciones de entrega globales)
CREATE TABLE "DeliveryAddresses" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "name" character varying NOT NULL,
  "address" text NOT NULL,
  "city" character varying,
  "postalCode" character varying,
  "contactName" character varying,
  "contactPhone" character varying,
  "isDefault" boolean DEFAULT false,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "DeliveryAddresses_pkey" PRIMARY KEY ("id")
);

-- Tabla: SupplierOrders (Pedidos a proveedores)
CREATE TABLE "SupplierOrders" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "budgetId" bigint,
  "supplierId" bigint,
  "orderNumber" character varying NOT NULL UNIQUE,
  "status" "SupplierOrderStatus" DEFAULT 'draft'::"SupplierOrderStatus",
  "deliveryAddressId" bigint,
  "customDeliveryAddress" text,
  "deliveryDate" date,
  "customerReference" character varying,
  "notes" text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "SupplierOrders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierOrders_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE SET NULL,
  CONSTRAINT "SupplierOrders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Suppliers"("id") ON DELETE SET NULL,
  CONSTRAINT "SupplierOrders_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "DeliveryAddresses"("id") ON DELETE SET NULL
);

-- Tabla: SupplierOrderItems (Ítems del pedido)
CREATE TABLE "SupplierOrderItems" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "orderId" bigint NOT NULL,
  "itemTableRowId" bigint,
  "productId" bigint,
  "reference" character varying,
  "description" text NOT NULL DEFAULT ''::text,
  "manufacturer" character varying,
  "quantity" numeric NOT NULL DEFAULT 1,
  "orderIndex" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "SupplierOrderItems_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierOrderItems_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SupplierOrders"("id") ON DELETE CASCADE,
  CONSTRAINT "SupplierOrderItems_itemTableRowId_fkey" FOREIGN KEY ("itemTableRowId") REFERENCES "BudgetItemTableRows"("id") ON DELETE SET NULL,
  CONSTRAINT "SupplierOrderItems_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE SET NULL
);

-- Añadir columna supplierId a Products
ALTER TABLE "Products" ADD COLUMN "supplierId" bigint;
ALTER TABLE "Products" ADD CONSTRAINT "Products_supplierId_fkey" 
  FOREIGN KEY ("supplierId") REFERENCES "Suppliers"("id") ON DELETE SET NULL;

-- Añadir supplierOrderId a EmailLogs para registrar envíos de pedidos
ALTER TABLE "EmailLogs" ADD COLUMN "supplierOrderId" bigint;
ALTER TABLE "EmailLogs" ADD CONSTRAINT "EmailLogs_supplierOrderId_fkey" 
  FOREIGN KEY ("supplierOrderId") REFERENCES "SupplierOrders"("id") ON DELETE CASCADE;

-- TRIGGERS
-- =============================================================================

CREATE TRIGGER "update_Suppliers_updatedAt"
  BEFORE UPDATE ON "Suppliers"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "update_DeliveryAddresses_updatedAt"
  BEFORE UPDATE ON "DeliveryAddresses"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "update_SupplierOrders_updatedAt"
  BEFORE UPDATE ON "SupplierOrders"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- INDEXES
-- =============================================================================

CREATE INDEX "Suppliers_name_idx" ON "Suppliers"("name");
CREATE INDEX "DeliveryAddresses_isDefault_idx" ON "DeliveryAddresses"("isDefault");
CREATE INDEX "SupplierOrders_budgetId_idx" ON "SupplierOrders"("budgetId");
CREATE INDEX "SupplierOrders_supplierId_idx" ON "SupplierOrders"("supplierId");
CREATE INDEX "SupplierOrders_status_idx" ON "SupplierOrders"("status");
CREATE INDEX "SupplierOrderItems_orderId_idx" ON "SupplierOrderItems"("orderId");
CREATE INDEX "Products_supplierId_idx" ON "Products"("supplierId");
CREATE INDEX "EmailLogs_supplierOrderId_idx" ON "EmailLogs"("supplierOrderId");

-- COMMENTS
-- =============================================================================
COMMENT ON TABLE "Suppliers" IS 'Proveedores a los que se realizan pedidos';
COMMENT ON TABLE "DeliveryAddresses" IS 'Direcciones de entrega globales (tiendas, almacenes)';
COMMENT ON TABLE "SupplierOrders" IS 'Pedidos realizados a proveedores desde presupuestos';
COMMENT ON TABLE "SupplierOrderItems" IS 'Ítems incluidos en cada pedido a proveedor';
COMMENT ON COLUMN "SupplierOrders"."status" IS 'draft: borrador, sent: enviado al proveedor, delivered: entregado';
COMMENT ON COLUMN "SupplierOrders"."customerReference" IS 'Referencia del cliente para identificar el pedido (ej: nombre cliente del presupuesto)';
