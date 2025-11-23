-- Renombrar la columna subtotal de Budgets a taxableBase
ALTER TABLE "Budgets"
  RENAME COLUMN "subtotal" TO "taxableBase";
