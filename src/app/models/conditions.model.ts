/**
 * Modelo para una condición individual
 */
export interface Condition {
  id: number;
  title: string;
  text: string;
}

/**
 * Modelo para las condiciones generales del presupuesto
 */
export interface GeneralConditions {
  name: string;
  conditions: Condition[];
}

/**
 * Tipo de plantilla de condiciones
 */
export type TemplateType = 'general' | 'dica' | 'diomo';

/**
 * Interfaz para una plantilla de condiciones
 */
export interface ConditionsTemplate {
  id: TemplateType;
  name: string;
  conditions: Condition[];
}
