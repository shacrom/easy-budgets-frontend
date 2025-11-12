/**
 * Modelo para una condición individual
 */
export interface Condition {
  id: string;
  title: string;
  text: string;
}

/**
 * Modelo para las condiciones generales del presupuesto
 */
export interface GeneralConditions {
  title: string;
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

/**
 * Plantilla General - Condiciones básicas
 */
const GENERAL_CONDITIONS: Condition[] = [
  {
    id: '1',
    title: 'Fecha de entrega',
    text: 'El plazo estimado de entrega es de [indicar días/semanas] desde la aceptación del presupuesto. Este plazo podrá verse modificado por causas ajenas a nuestra empresa o por cambios solicitados por el cliente.'
  },
  {
    id: '2',
    title: 'Garantías',
    text: 'Todos los trabajos realizados están garantizados por un periodo de 2 años desde la fecha de finalización, cubriendo defectos de materiales y mano de obra. La garantía no cubre daños producidos por un uso inadecuado o falta de mantenimiento.'
  },
  {
    id: '3',
    title: 'Condiciones generales',
    text: 'Los materiales empleados serán de primera calidad y cumplirán con todas las normativas vigentes. Cualquier modificación sobre el proyecto original será presupuestada aparte y deberá ser aprobada por el cliente antes de su ejecución. Al finalizar los trabajos, se procederá a la limpieza de la zona de obras.'
  },
  {
    id: '4',
    title: 'Forma de pago',
    text: 'El pago se realizará de la siguiente manera: 40% a la firma del contrato, 30% al inicio de las obras, y 30% restante a la finalización de los trabajos, previa conformidad del cliente.'
  },
  {
    id: '5',
    title: '',
    text: 'La venta de la mercancía descrita queda condicionada al total pago del importe estipulado en el plazo fijado, reservándose en todo caso Entrecuines Dos S.L el dominio de la citada mercancía hasta el total pago del importe contratado.'
  }
];

/**
 * Plantilla DICA - Condiciones específicas del proveedor DICA
 */
const DICA_CONDITIONS: Condition[] = [
  {
    id: '1',
    title: 'Fecha de entrega:',
    text: 'Se entregarán materiales contratados transcurrido el periodo fijado por fabricación tras la firma del contrato (actualmente entre 8 semanas desde la entrada del pedido en fábrica). Es responsabilidad del cliente que el espacio de la cocina esté limpio y preparado para la correcta instalación del mobiliario en la fecha pactada; de no ser así, no se podrán realizar los trabajos y no se harán responsables del montaje si no se pudiera cubrir la franja horaria de dos días previos ni dos días posteriores desde la fecha que el cliente había establecido para instalar el mobiliario, y tendrían un extra de 100 € por tener que volver a gestionar el montaje a partir de los 5 días de la fecha convenida para servir el mobiliario, si no se pudiera servir la mercancía por causas ajenas a ENTRECUINES DOS SL ese factor no les afecta ni tendrían coste adicionales del almacenamiento del mobiliario. Este precio no incluye obra actual.'
  },
  {
    id: '2',
    title: 'Duración de montaje:',
    text: 'La duración del montaje de muebles será de aproximadamente 6 días. El montaje de encimeras de cocina se realiza después de haber montado muebles y haber tomado medidas y se realiza conjuntamente en la medición.'
  },
  {
    id: '3',
    title: 'Garantías:',
    text: 'La garantía del mobiliario de cocina DICA es de 5 años desde fecha factura. Los costes de desplazamientos y mano de obra transcurrido el segundo año desde la adquisición de la cocina, serán a cargo del usuario final. La garantía de los electrodomésticos y bancadas se extiende según marca de cada fabricante. En caso de realizar una sustitución durante la garantía de la bancada sólo queda cubierto el material, no quedan cubiertas las instalaciones externas que ello conlleve (fontanería, electricidad, grúas).'
  },
  {
    id: '4',
    title: 'Condiciones generales:',
    text: 'Si los electrodomésticos no los suministra el cliente, la empresa Entrecuines no se responsabiliza de su montaje. Será de responsabilidad del cliente el montaje de sus electrodomésticos o los muebles para integrar. En el caso sobre la placa de gas no está incluida, recomendamos que la instale un instalador autorizado de gas. La instalación de la placa de gas no está incluida, si fuese necesario algún tipo de ensamblaje o el trabajo de alguna parte de grandes dimensiones, si fuese necesario algún tipo de elevador pequeño las obras de albañilería necesarias para la correcta instalación mediante andamio u otra necesaria. En caso de haber que subir un suelo, se avisará al cliente, es aconsejable que proteja todo el suelo desde la entrada de la casa. Las conexiones a la red de agua de la nueva grifería, lavadero, lamas y desagües para la cocina. Incluidas, estas la deberán realizar un fontanero. La instalación de la placa de gas no está incluida, recomendamos que la instale un instalador autorizado de gas. Los cambios de tonalidades y dibujo en las impresiones de las encimeras son propios del material y no son motivo de cambios ni reclamaciones, salvo por defecto del producto: previa autorización del comercial de la empresa la encimera. Los cambios de tonalidades y dibujo en las impresiones de las encimeras son propios del material y no son motivo de cambios ni reclamaciones, salvo por defecto del producto: previa autorización del comercial de la empresa.'
  },
  {
    id: '5',
    title: 'Forma de pago:',
    text: 'A la aceptación del presupuesto 1.000€ (como señal previa medición y comprobación del presupuesto en casa del cliente). Se entregará a cuenta el 40 % del precio total (descontando la señal) al realizar pedido de muebles y material contratado. Se entregará el 50 % del precio total al recibir mobiliario en el domicilio, o a la recepción en nuestro almacén si el cliente no pudiera recibirlos en su casa. Se entregará el 10 % restante al terminar montaje de muebles y materiales contratados.'
  },
  {
    id: '6',
    title: 'Pago mediante financiación:',
    text: 'Las cantidades se deberán abonar mediante trasferencia bancaria a Entrecuines Dos S.L a la cuenta: ES97 2100 4757 7813 0056 4698 de CAIXABANK. La venta de la mercancía descrita queda condicionada al total pago del importe estipulado en el plazo fijado, reservándose en todo caso Entrecuines Dos S.L el dominio de la citada mercancía hasta el total pago del importe contratado.'
  },
  {
    id: '7',
    title: '',
    text: 'La venta de la mercancía descrita queda condicionada al total pago del importe estipulado en el plazo fijado, reservándose en todo caso Entrecuines Dos S.L el dominio de la citada mercancía hasta el total pago del importe contratado.'
  }
];

/**
 * Plantilla DIOMO - Condiciones específicas del proveedor DIOMO
 */
const DIOMO_CONDITIONS: Condition[] = [
  {
    id: '1',
    title: 'Condiciones específicas Diomo',
    text: 'Este presupuesto incluye productos de la gama DIOMO, reconocidos por su excelencia en diseño y funcionalidad. Los materiales están sujetos a disponibilidad en el catálogo actual DIOMO.'
  },
  {
    id: '2',
    title: 'Plazo de fabricación y entrega',
    text: 'DIOMO fabrica bajo pedido con un plazo estimado de 6-8 semanas desde la confirmación del proyecto. Este plazo puede variar según la complejidad del diseño y personalización solicitada.'
  },
  {
    id: '3',
    title: 'Diseño y personalización',
    text: 'Se incluye un proyecto personalizado con renders 3D. Cualquier modificación en el diseño debe ser aprobada antes de iniciar la fabricación. Los cambios posteriores pueden implicar costes adicionales.'
  },
  {
    id: '4',
    title: 'Instalación profesional',
    text: 'La instalación será realizada por técnicos especializados y certificados por DIOMO, garantizando el montaje según estándares de calidad del fabricante. Incluye ajuste y nivelación de todos los elementos.'
  },
  {
    id: '5',
    title: 'Garantía Diomo',
    text: 'Garantía del fabricante DIOMO de 3 años para mobiliario y herrajes, y 5 años para electrodomésticos integrados. La garantía de instalación es de 2 años. Se requiere registro del producto para activar la garantía.'
  },
  {
    id: '6',
    title: 'Condiciones de pago',
    text: '50% de señal a la firma del contrato y aprobación del diseño, 30% antes de inicio de fabricación, y 20% a la finalización de la instalación. Los pagos deben realizarse según calendario establecido.'
  },
  {
    id: '7',
    title: 'Acabados y materiales',
    text: 'Los acabados y materiales se seleccionarán del catálogo DIOMO vigente. Se recomienda verificar muestras físicas antes de la confirmación definitiva, ya que los colores pueden variar según pantalla.'
  },
  {
    id: '8',
    title: '',
    text: 'La venta de la mercancía descrita queda condicionada al total pago del importe estipulado en el plazo fijado, reservándose en todo caso Entrecuines Dos S.L el dominio de la citada mercancía hasta el total pago del importe contratado.'
  }
];

/**
 * Plantillas disponibles de condiciones
 */
export const CONDITION_TEMPLATES: ConditionsTemplate[] = [
  {
    id: 'general',
    name: 'General',
    conditions: GENERAL_CONDITIONS
  },
  {
    id: 'dica',
    name: 'DICA',
    conditions: DICA_CONDITIONS
  },
  {
    id: 'diomo',
    name: 'DIOMO',
    conditions: DIOMO_CONDITIONS
  }
];

/**
 * Condiciones por defecto (General)
 */
export const DEFAULT_CONDITIONS: Condition[] = GENERAL_CONDITIONS;
