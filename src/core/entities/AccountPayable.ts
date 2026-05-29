export type AccountStatus = 'PENDIENTE' | 'PAGADA' | 'VENCIDA';

export type AccountPayable = {
  id: string;
  orden_compra_id: string;
  proveedor_id: string;
  proveedor_nombre?: string;
  proveedores?: { razon_social?: string };
  cliente_id: string;
  valor_obligacion: number;
  fecha_vencimiento: Date;
  estado: AccountStatus;
  saldo_pendiente: number;
  created_at: Date;
  updated_at: Date;
};

export type SupplierPaymentSummary = {
  proveedor_id: string;
  proveedor_nombre: string;
  nit: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  valor_semana_actual: number;
  valor_semanas_anteriores: number;
  gran_total: number;
};