-- Add vatRate column to Products table
ALTER TABLE "Products"
ADD COLUMN "vatRate" numeric DEFAULT 21 NOT NULL;

-- Opcional: actualiza todos los productos existentes a 21 si quieres asegurarte
UPDATE "Products" SET "vatRate" = 21 WHERE "vatRate" IS NULL;
