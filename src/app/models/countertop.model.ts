export interface Countertop {
  id?: number;
  budgetId: number;
  sectionTitle?: string;
  model: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
