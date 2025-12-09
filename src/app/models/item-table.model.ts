/**
 * Modelo para un elemento (fila) en una tabla de elementos
 * Puede representar materiales, iluminación, electrónicos, etc.
 * Mapea a la tabla BudgetItemTableRows en Supabase
 */
export interface ItemTableRow {
  id: number;
  tableId?: number;
  productId?: number;
  orderIndex: number;
  description: string;
  reference: string;
  manufacturer: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number; // calculado: cantidad * precioUnitario
}

/**
 * Modelo para una tabla de elementos en el presupuesto
 * Contiene múltiples filas de elementos con configuración de visibilidad
 * Mapea a la tabla BudgetItemTables en Supabase
 */
export interface ItemTable {
  id: number;
  budgetId?: number;
  orderIndex: number;
  title: string;
  rows: ItemTableRow[];
  // Column visibility for PDF export (per table)
  showReference?: boolean;
  showDescription?: boolean;
  showManufacturer?: boolean;
  showQuantity?: boolean;
  showUnitPrice?: boolean;
  showTotalPrice?: boolean;
}

// Re-export with old names for backward compatibility during migration
export type Material = ItemTableRow;
export type MaterialTable = ItemTable;
// Alias for cleaner naming
export type ItemRow = ItemTableRow;

