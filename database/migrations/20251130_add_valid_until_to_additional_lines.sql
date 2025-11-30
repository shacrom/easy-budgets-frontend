-- Añadir campo validUntil a BudgetAdditionalLines para indicar la fecha de validez de los descuentos
-- Esta columna es opcional y solo aplica para líneas de tipo 'discount'

ALTER TABLE public."BudgetAdditionalLines"
ADD COLUMN "validUntil" DATE NULL;

COMMENT ON COLUMN public."BudgetAdditionalLines"."validUntil" IS 'Fecha de validez del descuento (solo aplica para líneas de tipo discount)';
