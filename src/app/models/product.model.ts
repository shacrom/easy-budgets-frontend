/**
 * Modelo para un producto del catálogo
 */
export interface Product {
  id?: string;
  reference: string;
  description: string;
  manufacturer: string;
  basePrice: number;
  vatRate: number;
  category?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Modelo para crear un nuevo producto
 */
export interface CreateProductDto {
  reference: string;
  description: string;
  manufacturer: string;
  basePrice: number;
  vatRate: number;
  category?: string;
  active?: boolean;
}

/**
 * Modelo para actualizar un producto existente
 */
export interface UpdateProductDto {
  reference?: string;
  description?: string;
  manufacturer?: string;
  basePrice?: number;
  vatRate?: number;
  category?: string;
  active?: boolean;
}
