/**
 * Modelo para un material en el presupuesto
 * Contiene: descripción, cantidad, unidad, precio unitario y precio total
 */
export interface Material {
  id: string;
  descripcion: string;
  cantidad: number;
  unidad: string; // ej: "m²", "ud", "ml", "kg", etc.
  precioUnitario: number;
  precioTotal: number; // calculado: cantidad * precioUnitario
}

/**
 * Unidades de medida comunes para materiales
 */
export const UNIDADES_MEDIDA = [
  'ud',    // unidad
  'm²',    // metro cuadrado
  'ml',    // metro lineal
  'm',     // metro
  'kg',    // kilogramo
  'l',     // litro
  'h',     // hora (para mano de obra)
  'caja',
  'paquete',
  'conjunto'
] as const;

export type UnidadMedida = typeof UNIDADES_MEDIDA[number];
