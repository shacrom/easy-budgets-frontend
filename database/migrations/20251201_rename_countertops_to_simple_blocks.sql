-- Migración: Renombrar BudgetCountertops a BudgetSimpleBlocks
-- Fecha: 2025-12-01
-- Descripción: Renombra la tabla BudgetCountertops a BudgetSimpleBlocks y actualiza sus restricciones e índices.

-- 1. Renombrar la tabla
ALTER TABLE "BudgetCountertops" RENAME TO "BudgetSimpleBlocks";

-- 2. Renombrar la Primary Key
ALTER TABLE "BudgetSimpleBlocks" RENAME CONSTRAINT "BudgetCountertops_pkey" TO "BudgetSimpleBlocks_pkey";

-- 3. Renombrar la Foreign Key
ALTER TABLE "BudgetSimpleBlocks" RENAME CONSTRAINT "BudgetCountertops_budgetId_fkey" TO "BudgetSimpleBlocks_budgetId_fkey";

-- 4. Renombrar el índice
ALTER INDEX "idx_BudgetCountertops_budgetId" RENAME TO "idx_BudgetSimpleBlocks_budgetId";

-- 5. Actualizar el valor por defecto de sectionTitle
ALTER TABLE "BudgetSimpleBlocks" ALTER COLUMN "sectionTitle" SET DEFAULT 'Bloque Simple';
