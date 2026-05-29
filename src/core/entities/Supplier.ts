export type Supplier = {
  id: string;
  razon_social: string;
  nit: string;
  banco: string;
  tipo_cuenta: 'AHORROS' | 'CORRIENTE';
  numero_cuenta: string;
  dias_credito: number;
  telefono?: string;
  productos_que_vende?: string;
  cliente_id?: string;
  created_at: Date;
  updated_at: Date;
};

export type CreateSupplierDTO = {
  razon_social: string;
  nit: string;
  banco: string;
  tipo_cuenta: 'AHORROS' | 'CORRIENTE';
  numero_cuenta: string;
  dias_credito?: number;
  telefono?: string;
  productos_que_vende?: string;
  cliente_id?: string;
};
