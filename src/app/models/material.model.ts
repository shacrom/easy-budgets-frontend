/**
 * Modelo para un material en el presupuesto
 * Contiene: descripción, fabricante, cantidad, precio unitario y precio total
 */
export interface Material {
  id: string;
  description: string;
  manufacturer: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number; // calculado: cantidad * precioUnitario
}
