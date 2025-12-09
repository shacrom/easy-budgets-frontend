export type SummaryLineType = 'adjustment' | 'discount' | 'optional' | 'note';

/**
 * Modelo para una línea del resumen del presupuesto
 */
export interface SummaryLine {
  id: number;
  concept: string;
  amount: number;
  conceptType: SummaryLineType;
  orderIndex?: number;
  /** Fecha de validez del descuento (solo aplica para descuentos) */
  validUntil?: string;
}

/**
 * Modelo completo del resumen del presupuesto
 */
export interface BudgetSummary {
  totalBlocks: number;
  totalItems: number;
  /** @deprecated Use totalItems instead - kept for backward compatibility */
  totalMaterials?: number;
  /** Total from the simple block section (formerly countertop) */
  totalSimpleBlock?: number;
  /** @deprecated Use totalSimpleBlock instead - kept for backward compatibility with database */
  totalCountertop?: number;
  taxableBase: number;
  vat: number;
  vatPercentage: number;
  grandTotal: number;
  additionalLines?: SummaryLine[]; // Líneas adicionales opcionales (descuentos, extras, etc.)
}
