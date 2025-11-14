-- Migration: add DNI column to Customers table
-- Adds a new optional DNI (national id) column and backfills it with existing taxId values when present

ALTER TABLE "Customers"
ADD COLUMN IF NOT EXISTS "dni" VARCHAR(50);

UPDATE "Customers"
SET "dni" = COALESCE("dni", "taxId")
WHERE "taxId" IS NOT NULL;
