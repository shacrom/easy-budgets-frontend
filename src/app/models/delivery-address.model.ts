/**
 * Interface que representa una dirección de entrega global.
 * Son direcciones predefinidas de la empresa (tiendas, almacenes, etc.)
 * donde los proveedores pueden enviar los productos.
 */
export interface DeliveryAddress {
  id: number;
  name: string;
  address: string;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * DTO para crear una nueva dirección de entrega.
 * Omite los campos autogenerados.
 */
export type CreateDeliveryAddressDto = Omit<DeliveryAddress, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * DTO para actualizar una dirección de entrega existente.
 * Todos los campos son opcionales.
 */
export type UpdateDeliveryAddressDto = Partial<Omit<DeliveryAddress, 'id' | 'createdAt' | 'updatedAt'>>;
