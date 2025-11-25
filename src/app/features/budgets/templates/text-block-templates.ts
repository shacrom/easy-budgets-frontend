import { DescriptionSection } from '../../../models/budget-text-block.model';

export interface TextBlockTemplate {
  id: number;
  name: string;
  provider?: string;
  heading?: string;
  sections: Array<Pick<DescriptionSection, 'title' | 'text'>>;
}

export const TEXT_BLOCK_TEMPLATES: TextBlockTemplate[] = [
  {
    id: 1,
    name: 'Plantilla Dica',
    provider: 'Dica',
    heading: 'Cocina Dica - Serie 45 Nude',
    sections: [
      {
        title: 'NUESTRAS COCINAS',
        text: `Las cocinas Dica se diseñan y fabrican íntegramente en España, utilizando materiales de primerísima calidad, herrajes innovadores, laminados canteados con la última tecnología láser y materiales seleccionados en exclusiva que cumplen los más estrictos controles de calidad.`
      },
      {
        title: 'TU PROYECTO',
        text: `Este proyecto se ha diseñado en la serie 45 acabado Laminado Nude Mi en los muebles bajos.
Color de gola en acabado aluminio lacado Piedra.
Columnas con tirador lacado acabado Nude.
La puerta en acabado laminado a dos caras y canteada por los cuatro lados en ABS con sellado antihumedad en el mismo color que la puerta.

Muebles bajos con cajones con guías de extracción total que permiten visualizar cómodamente el interior de los mismos.
El color interior de los muebles en acabado Blanco Latte.`
      },
      {
        title: 'DIMENSIONES',
        text: `Módulos bajos de altura de 78cm x 60cm fondo + 10cm zócalo. Altura total mobiliario bajo de 88cm + bancada.
Columnas de 222cm de altura + 10cm de zócalo.`
      },
      {
        title: 'ACCESORIOS INCLUIDOS EN PRECIO',
        text: `Golas simples y dobles acabado lacado Grafito.
1 separadores para caceroleros de 90cm.
Zócalo acabado Grafito H 10cm.
Módulos altos de h. 84m x fondo 35cm, con gola oculta para facilitar apertura sin tirador, puerta con sistema de retención en cierre para evitar golpes.`
      }
    ]
  },
  {
    id: 2,
    name: 'Plantilla Diomo',
    provider: 'Diomo',
    heading: 'Cocina Diomo - Serie Jade Verde Onix',
    sections: [
      {
        title: 'NUESTRAS COCINAS',
        text: `Las cocinas Diomo se diseñan y fabrican íntegramente en España, utilizando materiales de primerísima calidad, herrajes innovadores, laminados canteados con la última tecnología láser y materiales seleccionados exclusivas que cumplen los más estrictos controles de calidad.`
      },
      {
        title: 'TU PROYECTO',
        text: `Este proyecto se ha diseñado en la serie Jade acabado Laminado Verde Onix en los muebles bajos.

Frente liso mate a dos caras, terminación cuatro cantos en ABS. Color frente.

Apertura mediante gola de aluminio (blanco, negro o plata).
Módulos con cajón metálico de doble pared Tamdembox, con guías Blum de extracción total y cierre amortiguado.

Zócalo en aluminio negro.`
      },
      {
        title: 'DIMENSIONES',
        text: `Módulos bajos de altura 78cm + 10cm de zócalo, altura total mobiliario bajo de 88cm + bancada.
Módulos altos de 84cm x 35cm de profundo.
Columnas de altura 210cm + 10cm de zócalo. Altura total columnas de 220cm.`
      },
      {
        title: 'ACCESORIOS INCLUIDOS EN EL PRECIO',
        text: `Zócalo acabado Negro H 10cm.`
      }
    ]
  }
];
