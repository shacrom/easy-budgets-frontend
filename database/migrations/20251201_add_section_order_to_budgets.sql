ALTER TABLE public."Budgets"
ADD COLUMN "sectionOrder" text[] DEFAULT ARRAY['simpleBlock', 'textBlocks', 'materials', 'summary', 'conditions', 'signature'];
