-- ============================================
-- TEXT BLOCK TEMPLATES
-- ============================================
-- Tablas para almacenar plantillas de bloques de texto
-- Similar a ConditionTemplates y ConditionTemplateSections

-- Tabla principal de plantillas
create table public."TextBlockTemplates" (
  id bigserial not null,
  name character varying(255) not null,
  provider character varying(255) null,
  heading character varying(255) null,
  "createdAt" timestamp with time zone null default now(),
  "updatedAt" timestamp with time zone null default now(),
  constraint TextBlockTemplates_pkey primary key (id)
) TABLESPACE pg_default;

-- Índice para ordenar por nombre
create index IF not exists "idx_TextBlockTemplates_name" on public."TextBlockTemplates" using btree (name) TABLESPACE pg_default;

-- Trigger para actualizar updatedAt
create trigger "update_TextBlockTemplates_updatedAt" BEFORE
update on "TextBlockTemplates" for EACH row
execute FUNCTION update_updated_at_column();

-- Tabla de secciones de plantillas
create table public."TextBlockTemplateSections" (
  id bigserial not null,
  template_id bigint not null,
  title character varying(255) not null,
  content text null,
  order_index integer not null default 0,
  "createdAt" timestamp with time zone null default now(),
  "updatedAt" timestamp with time zone null default now(),
  constraint TextBlockTemplateSections_pkey primary key (id),
  constraint TextBlockTemplateSections_templateId_fkey foreign KEY (template_id) references "TextBlockTemplates" (id) on delete CASCADE
) TABLESPACE pg_default;

-- Índices para secciones
create index IF not exists "idx_TextBlockTemplateSections_templateId" on public."TextBlockTemplateSections" using btree (template_id) TABLESPACE pg_default;

create index IF not exists "idx_TextBlockTemplateSections_order" on public."TextBlockTemplateSections" using btree (template_id, order_index) TABLESPACE pg_default;

-- Trigger para actualizar updatedAt
create trigger "update_TextBlockTemplateSections_updatedAt" BEFORE
update on "TextBlockTemplateSections" for EACH row
execute FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Migrar plantillas hardcodeadas
-- ============================================

-- Insertar plantilla Dica
INSERT INTO public."TextBlockTemplates" (name, provider, heading)
VALUES ('Plantilla Dica', 'Dica', 'Cocina Dica - Serie 45 Nude');

-- Insertar secciones de plantilla Dica
INSERT INTO public."TextBlockTemplateSections" (template_id, title, content, order_index)
SELECT
  t.id,
  section.title,
  section.content,
  section.order_index
FROM public."TextBlockTemplates" t
CROSS JOIN (VALUES
  ('NUESTRAS COCINAS', 'Las cocinas Dica se diseñan y fabrican íntegramente en España, utilizando materiales de primerísima calidad, herrajes innovadores, laminados canteados con la última tecnología láser y materiales seleccionados en exclusiva que cumplen los más estrictos controles de calidad.', 0),
  ('TU PROYECTO', 'Este proyecto se ha diseñado en la serie 45 acabado Laminado Nude Mi en los muebles bajos.
Color de gola en acabado aluminio lacado Piedra.
Columnas con tirador lacado acabado Nude.
La puerta en acabado laminado a dos caras y canteada por los cuatro lados en ABS con sellado antihumedad en el mismo color que la puerta.

Muebles bajos con cajones con guías de extracción total que permiten visualizar cómodamente el interior de los mismos.
El color interior de los muebles en acabado Blanco Latte.', 1),
  ('DIMENSIONES', 'Módulos bajos de altura de 78cm x 60cm fondo + 10cm zócalo. Altura total mobiliario bajo de 88cm + bancada.
Columnas de 222cm de altura + 10cm de zócalo.', 2),
  ('ACCESORIOS INCLUIDOS EN PRECIO', 'Golas simples y dobles acabado lacado Grafito.
1 separadores para caceroleros de 90cm.
Zócalo acabado Grafito H 10cm.
Módulos altos de h. 84m x fondo 35cm, con gola oculta para facilitar apertura sin tirador, puerta con sistema de retención en cierre para evitar golpes.', 3)
) AS section(title, content, order_index)
WHERE t.name = 'Plantilla Dica';

-- Insertar plantilla Diomo
INSERT INTO public."TextBlockTemplates" (name, provider, heading)
VALUES ('Plantilla Diomo', 'Diomo', 'Cocina Diomo - Serie Jade Verde Onix');

-- Insertar secciones de plantilla Diomo
INSERT INTO public."TextBlockTemplateSections" (template_id, title, content, order_index)
SELECT
  t.id,
  section.title,
  section.content,
  section.order_index
FROM public."TextBlockTemplates" t
CROSS JOIN (VALUES
  ('NUESTRAS COCINAS', 'Las cocinas Diomo se diseñan y fabrican íntegramente en España, utilizando materiales de primerísima calidad, herrajes innovadores, laminados canteados con la última tecnología láser y materiales seleccionados exclusivas que cumplen los más estrictos controles de calidad.', 0),
  ('TU PROYECTO', 'Este proyecto se ha diseñado en la serie Jade acabado Laminado Verde Onix en los muebles bajos.

Frente liso mate a dos caras, terminación cuatro cantos en ABS. Color frente.

Apertura mediante gola de aluminio (blanco, negro o plata).
Módulos con cajón metálico de doble pared Tamdembox, con guías Blum de extracción total y cierre amortiguado.

Zócalo en aluminio negro.', 1),
  ('DIMENSIONES', 'Módulos bajos de altura 78cm + 10cm de zócalo, altura total mobiliario bajo de 88cm + bancada.
Módulos altos de 84cm x 35cm de profundo.
Columnas de altura 210cm + 10cm de zócalo. Altura total columnas de 220cm.', 2),
  ('ACCESORIOS INCLUIDOS EN EL PRECIO', 'Zócalo acabado Negro H 10cm.', 3)
) AS section(title, content, order_index)
WHERE t.name = 'Plantilla Diomo';
