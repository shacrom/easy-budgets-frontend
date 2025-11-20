import { Customer } from './customer.model';
import { BudgetTextBlock } from './budget-text-block.model';
import { Material } from './material.model';

export interface Budget {
  id: string;
  customerId?: string;
  budgetNumber?: string;
  title?: string;
  status?: string;
  validUntil?: string;
  createdAt?: string;
  updatedAt?: string;
  
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
