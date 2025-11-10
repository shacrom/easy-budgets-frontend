/**
 * Modelo para un material en el presupuesto
 * Contiene: descripción, fabricante, cantidad, precio unitario y precio total
 */
export interface Material {
  id: string;
  descripcion: string;
  fabricante: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number; // calculado: cantidad * precioUnitario
}
