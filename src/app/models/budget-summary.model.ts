/**
 * Modelo para una línea del resumen del presupuesto
 */
export interface SummaryLine {
  id: string;
  concepto: string;
  importe: number;
}

/**
 * Modelo completo del resumen del presupuesto
 */
export interface BudgetSummary {
  totalBloques: number;
  totalMateriales: number;
  subtotal: number;
  iva: number;
  porcentajeIva: number; // Por defecto 21% en España
  totalGeneral: number;
  lineasAdicionales?: SummaryLine[]; // Líneas adicionales opcionales (descuentos, extras, etc.)
}
