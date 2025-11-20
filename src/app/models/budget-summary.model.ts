/**
 * Modelo para una línea del resumen del presupuesto
 */
export interface SummaryLine {
  id: string;
  concept: string;
  amount: number;
}

/**
 * Modelo completo del resumen del presupuesto
 */
export interface BudgetSummary {
  totalBlocks: number;
  totalMaterials: number;
  totalCountertop?: number;
  subtotal: number;
  vat: number;
  vatPercentage: number;
  grandTotal: number;
  additionalLines?: SummaryLine[]; // Líneas adicionales opcionales (descuentos, extras, etc.)
}
