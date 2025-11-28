/**
 * Modelo para una sección de descripción dentro de un bloque
 * Mapea a la tabla BudgetTextBlockSections en Supabase
 */
export interface DescriptionSection {
  id?: number;                // Autoincremental generado por Supabase
  textBlockId?: number;       // Referencia al bloque padre
  orderIndex: number;         // Orden de visualización
  title: string;              // Título de la sección
  text: string;               // Contenido descriptivo
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Modelo para un bloque de texto en el presupuesto
 * Mapea a la tabla BudgetTextBlocks en Supabase
 * Contiene: encabezado, lista de secciones de descripción, link, foto y total
 */
export interface BudgetTextBlock {
  id?: number;                      // Autoincremental generado por Supabase
  budgetId: number;                 // Referencia al presupuesto
  orderIndex: number;               // Orden del bloque en el presupuesto
  sectionTitle?: string;            // Título personalizable de la sección
  heading: string;                  // Encabezado principal del bloque
  descriptions?: DescriptionSection[]; // Secciones de descripción (relación 1:N)
  link?: string;                    // Link opcional
  imageUrl?: string;                // URL de la imagen (antes 'photo')
  subtotal: number;                 // Total del bloque (antes 'total')
  createdAt?: Date;
  updatedAt?: Date;
}
