export type Inventory = {
  id: string;
  cliente_id: string;
  insumo_id: string;
  insumo_nombre?: string;
  stock_actual: number;
  ultima_actualizacion: Date;
};

export type InventoryMovement = {
  id: string;
  cliente_id: string;
  insumo_id: string;
  tipo: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  referencia_id: string;
  fecha: Date;
  descripcion: string;
};