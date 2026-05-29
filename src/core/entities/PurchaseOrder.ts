export type OrderStatus = 'PENDIENTE' | 'APROBADA' | 'RECIBIDA' | 'CANCELADA';

export type PurchaseOrderDetail = {
  id: string;
  insumo_id: string;
  insumo_nombre?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

export type PurchaseOrder = {
  id: string;
  proveedor_id: string;
  proveedor_nombre?: string;
  cliente_id: string;
  fecha_emision: Date;
  fecha_recepcion?: Date;
  estado: OrderStatus;
  subtotal_productos: number;
  valor_domicilio: number;
  total: number;
  notas: string;
  detalles: PurchaseOrderDetail[];
  created_at: Date;
  updated_at: Date;
};

export type CreatePurchaseOrderDTO = {
  proveedor_id: string;
  cliente_id: string;
  valor_domicilio?: number;
  notas?: string;
  detalles: Omit<PurchaseOrderDetail, 'id' | 'subtotal'>[];
};
