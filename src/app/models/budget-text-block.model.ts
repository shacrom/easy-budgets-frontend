/**
 * Modelo para un bloque de texto en el presupuesto
 * Contiene: encabezado, texto, link, foto y total
 */
export interface BudgetTextBlock {
  id: string;
  encabezado: string;
  texto: string;
  link?: string;
  foto?: string;
  total: number;
}
