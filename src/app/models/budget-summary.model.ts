export type SummaryLineType = 'adjustment' | 'discount' | 'optional' | 'note';

/**
 * Modelo para una línea del resumen del presupuesto
 */
export interface SummaryLine {
  id: string;
  concept: string;
  amount: number;
  conceptType: SummaryLineType;
  orderIndex?: number;
}

/**
 * Modelo completo del resumen del presupuesto
 */
export interface BudgetSummary {
  totalBlocks: number;
  totalMaterials: number;
  totalCountertop?: number;
  taxableBase: number;
  vat: number;
  vatPercentage: number;
  grandTotal: number;
  additionalLines?: SummaryLine[]; // Líneas adicionales opcionales (descuentos, extras, etc.)
}
