import { Customer } from './customer.model';
import { CompositeBlock } from './composite-block.model';
import { ItemTable } from './item-table.model';
import { SummaryLine } from './budget-summary.model';
import { Condition } from './conditions.model';
import { SimpleBlock } from './simple-block.model';

export type BudgetStatus = 'not_completed' | 'completed' | 'contract';

export interface Budget {
  id: number;
  customerId?: number;
  budgetNumber?: string;
  title?: string;
  status?: BudgetStatus;
  validUntil?: string;
  createdAt?: string;
  updatedAt?: string;
  taxableBase?: number;
  taxPercentage?: number;
  taxAmount?: number;
  total?: number;
  notes?: string;
  pdfUrl?: string;

  // Section titles
  itemTablesSectionTitle?: string;
  conditionsTitle?: string;

  // Logo URLs
  companyLogoUrl?: string;
  supplierLogoUrl?: string;

  // Visibility flags
  showCompositeBlocks: boolean;
  showItemTables: boolean;
  showSimpleBlock: boolean;
  showConditions: boolean;
  showSummary: boolean;
  showSignature: boolean;

  // Order
  sectionOrder: string[];

  // Relations
  customer?: Customer;
  compositeBlocks?: CompositeBlock[];
  itemTables?: ItemTable[];
  additionalLines?: SummaryLine[];
  conditions?: Condition[];
  simpleBlock?: SimpleBlock;
}
