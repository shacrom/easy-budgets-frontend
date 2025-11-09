/**
 * Modelo para una condición individual
 */
export interface Condition {
  id: string;
  titulo: string;
  texto: string;
}

/**
 * Modelo para las condiciones generales del presupuesto
 */
export interface GeneralConditions {
  titulo: string;
  condiciones: Condition[];
}

/**
 * Condiciones por defecto basadas en el ejemplo
 */
export const DEFAULT_CONDITIONS: Condition[] = [
  {
    id: '1',
    titulo: 'VALIDEZ DEL PRESUPUESTO',
    texto: 'El presente presupuesto tiene una validez de 30 días naturales desde la fecha de emisión. Transcurrido este plazo, los precios y condiciones podrán ser modificados.'
  },
  {
    id: '2',
    titulo: 'FORMA DE PAGO',
    texto: 'El pago se realizará de la siguiente manera: 40% a la firma del contrato, 30% al inicio de las obras, y 30% restante a la finalización de los trabajos, previa conformidad del cliente.'
  },
  {
    id: '3',
    titulo: 'PLAZO DE EJECUCIÓN',
    texto: 'El plazo estimado de ejecución es de [indicar días/semanas], a contar desde la fecha de inicio acordada. Este plazo podrá verse modificado por causas ajenas a nuestra empresa.'
  },
  {
    id: '4',
    titulo: 'GARANTÍAS',
    texto: 'Todos los trabajos realizados están garantizados por un periodo de 2 años desde la fecha de finalización, cubriendo defectos de materiales y mano de obra.'
  },
  {
    id: '5',
    titulo: 'MATERIALES',
    texto: 'Los materiales empleados serán de primera calidad y cumplirán con todas las normativas vigentes. Cualquier cambio en las especificaciones deberá ser aprobado por escrito.'
  },
  {
    id: '6',
    titulo: 'PERMISOS Y LICENCIAS',
    texto: 'Los trámites y costes de permisos y licencias necesarias correrán por cuenta del cliente, salvo que se especifique lo contrario en el presupuesto.'
  },
  {
    id: '7',
    titulo: 'LIMPIEZA Y ESCOMBROS',
    texto: 'Al finalizar los trabajos, se procederá a la limpieza de la zona de obras y retirada de escombros, dejando el espacio en perfectas condiciones de uso.'
  },
  {
    id: '8',
    titulo: 'MODIFICACIONES',
    texto: 'Cualquier modificación sobre el proyecto original será presupuestada aparte y deberá ser aprobada por el cliente antes de su ejecución.'
  }
];
