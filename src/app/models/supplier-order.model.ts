import { DeliveryAddress } from './delivery-address.model';
import { Supplier } from './supplier.model';
import { SupplierOrderItem } from './supplier-order-item.model';

/**
 * Estados posibles de un pedido a proveedor.
 * - draft: Borrador, antes de enviar al proveedor
 * - sent: Enviado al proveedor (automático o manual)
 * - delivered: Entregado, confirmado manualmente
 */
export type SupplierOrderStatus = 'draft' | 'sent' | 'delivered';

/**
 * Interface que representa un pedido a proveedor.
 * Un pedido agrupa los productos seleccionados de un presupuesto
 * que se van a solicitar a un proveedor específico.
 */
export interface SupplierOrder {
  id: number;
  budgetId?: number | null;
  supplierId?: number | null;
  orderNumber: string;
  status: SupplierOrderStatus;
  deliveryAddressId?: number | null;
  customDeliveryAddress?: string | null;
  deliveryDate?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  customerReference?: string | null;
  notes?: string | null;
  totalAmount?: number | null;
  itemCount?: number | null;
  createdAt?: string;
  updatedAt?: string;
  
  // Relaciones (pobladas opcionalmente)
  supplier?: Supplier | null;
  deliveryAddress?: DeliveryAddress | null;
  items?: SupplierOrderItem[];
}

/**
 * DTO para crear un nuevo pedido a proveedor.
 * Omite los campos autogenerados y relaciones.
 */
export type CreateSupplierOrderDto = Omit<SupplierOrder, 'id' | 'createdAt' | 'updatedAt' | 'supplier' | 'deliveryAddress' | 'items'>;

/**
 * DTO para actualizar un pedido existente.
 * Todos los campos son opcionales.
 */
export type UpdateSupplierOrderDto = Partial<Omit<SupplierOrder, 'id' | 'createdAt' | 'updatedAt' | 'supplier' | 'deliveryAddress' | 'items'>>;

/**
 * Información completa de un pedido con todas sus relaciones.
 * Usado para visualización y generación de PDF.
 */
export interface SupplierOrderWithDetails extends SupplierOrder {
  supplier: Supplier | null;
  deliveryAddress: DeliveryAddress | null;
  items: SupplierOrderItem[];
  budgetNumber?: string;
  customerName?: string;
}

/**
 * Mapeo de estados a etiquetas en español para UI
 */
export const SUPPLIER_ORDER_STATUS_LABELS: Record<SupplierOrderStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  delivered: 'Entregado'
};

/**
 * Mapeo de estados a colores para chips/badges
 */
export const SUPPLIER_ORDER_STATUS_COLORS: Record<SupplierOrderStatus, string> = {
  draft: 'warn',
  sent: 'primary',
  delivered: 'accent'
};
