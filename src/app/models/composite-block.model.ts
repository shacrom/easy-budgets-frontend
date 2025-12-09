/**
 * Modelo para una sección de descripción dentro de un bloque compuesto
 * Mapea a la tabla BudgetCompositeBlockSections en Supabase
 */
export interface CompositeBlockSection {
  id?: number;                // Autoincremental generado por Supabase
  compositeBlockId?: number;  // Referencia al bloque padre
  orderIndex: number;         // Orden de visualización
  title: string;              // Título de la sección
  text: string;               // Contenido descriptivo
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Modelo para un bloque compuesto en el presupuesto
 * Mapea a la tabla BudgetCompositeBlocks en Supabase
 * Contiene: encabezado, lista de secciones de descripción, link, foto y total
 */
export interface CompositeBlock {
  id?: number;                        // Autoincremental generado por Supabase
  budgetId: number;                   // Referencia al presupuesto
  orderIndex: number;                 // Orden del bloque en el presupuesto
  sectionTitle?: string;              // Título personalizable de la sección
  heading: string;                    // Encabezado principal del bloque
  descriptions?: CompositeBlockSection[]; // Secciones de descripción (relación 1:N)
  link?: string;                      // Link opcional
  imageUrl?: string;                  // URL de la imagen
  subtotal: number;                   // Total del bloque
  createdAt?: Date;
  updatedAt?: Date;
}

// Re-export with old names for backward compatibility during migration
export type BudgetTextBlock = CompositeBlock;
export type DescriptionSection = CompositeBlockSection;
