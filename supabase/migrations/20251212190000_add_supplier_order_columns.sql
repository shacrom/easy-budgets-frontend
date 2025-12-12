-- =============================================================================
-- MIGRATION: Add missing columns to Supplier Orders tables
-- =============================================================================
-- Fecha: 2024-12-12
-- Descripción: Añade columnas faltantes a las tablas de pedidos a proveedores
-- =============================================================================

-- Añadir contactName a Suppliers
ALTER TABLE "Suppliers" ADD COLUMN IF NOT EXISTS "contactName" character varying;

-- Añadir province a DeliveryAddresses
ALTER TABLE "DeliveryAddresses" ADD COLUMN IF NOT EXISTS "province" character varying;

-- Añadir campos de tracking y totales a SupplierOrders
ALTER TABLE "SupplierOrders" ADD COLUMN IF NOT EXISTS "sentAt" timestamp with time zone;
ALTER TABLE "SupplierOrders" ADD COLUMN IF NOT EXISTS "deliveredAt" timestamp with time zone;
ALTER TABLE "SupplierOrders" ADD COLUMN IF NOT EXISTS "totalAmount" numeric;
ALTER TABLE "SupplierOrders" ADD COLUMN IF NOT EXISTS "itemCount" integer;

-- Añadir campos de pricing a SupplierOrderItems
ALTER TABLE "SupplierOrderItems" ADD COLUMN IF NOT EXISTS "concept" character varying NOT NULL DEFAULT '';
ALTER TABLE "SupplierOrderItems" ADD COLUMN IF NOT EXISTS "unit" character varying;
ALTER TABLE "SupplierOrderItems" ADD COLUMN IF NOT EXISTS "unitPrice" numeric NOT NULL DEFAULT 0;
ALTER TABLE "SupplierOrderItems" ADD COLUMN IF NOT EXISTS "totalPrice" numeric NOT NULL DEFAULT 0;

-- Renombrar description para usar como campo secundario
-- Primero verificamos si concept ya tiene datos para no perder información
UPDATE "SupplierOrderItems" SET "concept" = "description" WHERE "concept" = '' AND "description" != '';

-- Comments
COMMENT ON COLUMN "Suppliers"."contactName" IS 'Persona de contacto en el proveedor';
COMMENT ON COLUMN "DeliveryAddresses"."province" IS 'Provincia de la dirección';
COMMENT ON COLUMN "SupplierOrders"."sentAt" IS 'Fecha y hora de envío del pedido';
COMMENT ON COLUMN "SupplierOrders"."deliveredAt" IS 'Fecha y hora de entrega del pedido';
COMMENT ON COLUMN "SupplierOrders"."totalAmount" IS 'Importe total del pedido (calculado)';
COMMENT ON COLUMN "SupplierOrders"."itemCount" IS 'Número de ítems en el pedido (calculado)';
COMMENT ON COLUMN "SupplierOrderItems"."concept" IS 'Nombre/concepto del producto';
COMMENT ON COLUMN "SupplierOrderItems"."unit" IS 'Unidad de medida (ud, m2, ml, etc)';
COMMENT ON COLUMN "SupplierOrderItems"."unitPrice" IS 'Precio unitario del producto';
COMMENT ON COLUMN "SupplierOrderItems"."totalPrice" IS 'Precio total (quantity * unitPrice)';
