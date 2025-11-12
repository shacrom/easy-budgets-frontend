/**
 * Modelo para una sección de descripción dentro de un bloque
 */
export interface DescriptionSection {
  id: string;
  title: string;
  text: string;
}

/**
 * Modelo para un bloque de texto en el presupuesto
 * Contiene: encabezado, lista de secciones de descripción, link, foto y total
 */
export interface BudgetTextBlock {
  id: string;
  heading: string;
  descriptions: DescriptionSection[]; // Lista de secciones con título y texto
  link?: string;
  photo?: string;
  total: number;
}
