/**
 * Modelo para un material en el presupuesto
 * Contiene: descripción, fabricante, cantidad, precio unitario y precio total
 */
export interface Material {
  id: string;
  tableId?: string;
  productId?: string;
  orderIndex: number;
  description: string;
  reference: string;
  manufacturer: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number; // calculado: cantidad * precioUnitario
}

export interface MaterialTable {
  id: string;
  budgetId?: string;
  orderIndex: number;
  title: string;
  rows: Material[];
}
