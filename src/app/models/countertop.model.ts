export interface Countertop {
  id?: string;
  budgetId: string;
  model: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
