/**
 * Interface que representa un proveedor en el sistema.
 * Los proveedores son las empresas a las que se realizan pedidos de productos.
 */
export interface Supplier {
  id: number;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * DTO para crear un nuevo proveedor.
 * Omite los campos autogenerados.
 */
export type CreateSupplierDto = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * DTO para actualizar un proveedor existente.
 * Todos los campos son opcionales excepto el id.
 */
export type UpdateSupplierDto = Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>;
