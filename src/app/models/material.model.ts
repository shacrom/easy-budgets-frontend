/**
 * Modelo para un material en el presupuesto
 * Contiene: descripción, fabricante, cantidad, precio unitario y precio total
 */
export interface Material {
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

export interface MaterialTable {
  id: number;
  budgetId?: number;
  orderIndex: number;
  title: string;
  rows: Material[];
  // Column visibility for PDF export (per table)
  showReference?: boolean;
  showDescription?: boolean;
  showManufacturer?: boolean;
  showQuantity?: boolean;
  showUnitPrice?: boolean;
  showTotalPrice?: boolean;
}
