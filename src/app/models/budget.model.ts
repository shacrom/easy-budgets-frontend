import { Customer } from './customer.model';
import { BudgetTextBlock } from './budget-text-block.model';
import { Material } from './material.model';

export type BudgetStatus = 'completed' | 'not_completed';

export interface Budget {
  id: number;
  customerId?: number;
  budgetNumber?: string;
  title?: string;
  status?: BudgetStatus;
  validUntil?: string;
  createdAt?: string;
  updatedAt?: string;

  // Section titles
  materialsSectionTitle?: string;

  // Logo URLs
  companyLogoUrl?: string;
  supplierLogoUrl?: string;

  // Visibility flags
  showTextBlocks: boolean;
  showMaterials: boolean;
  showCountertop: boolean;
  showConditions: boolean;

  // Relations
  customer?: Customer;
  textBlocks?: BudgetTextBlock[];
  materials?: Material[];
}
