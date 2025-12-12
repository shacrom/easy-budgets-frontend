/**
 * Interface que representa un ítem dentro de un pedido a proveedor.
 * Cada ítem corresponde a un producto seleccionado de las tablas de ítems del presupuesto.
 */
export interface SupplierOrderItem {
  id: number;
  orderId: number;
  itemTableRowId?: number | null;
  productId?: number | null;
  reference?: string | null;
  concept: string;
  description?: string | null;
  supplierId?: number | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  totalPrice: number;
  orderIndex: number;
  createdAt?: string;
}

/**
 * DTO para crear un nuevo ítem de pedido.
 * Omite los campos autogenerados.
 */
export type CreateSupplierOrderItemDto = Omit<SupplierOrderItem, 'id' | 'createdAt'>;

/**
 * DTO para actualizar un ítem de pedido existente.
 * Todos los campos son opcionales.
 */
export type UpdateSupplierOrderItemDto = Partial<Omit<SupplierOrderItem, 'id' | 'orderId' | 'createdAt'>>;
