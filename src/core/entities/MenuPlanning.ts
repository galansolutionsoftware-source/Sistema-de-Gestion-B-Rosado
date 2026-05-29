export type ServiceSlot = 'DESAYUNO' | 'REFRIGERIO_AM' | 'ALMUERZO' | 'REFRIGERIO_PM' | 'CENA';

export type MenuPlanning = {
  id: string;
  cliente_id: string;
  fecha: Date;
  franja_id: string;
  franja_nombre?: ServiceSlot;
  ficha_id: string;
  ficha_nombre?: string;
  num_raciones: number;
  created_at: Date;
  updated_at: Date;
};

export type CreateMenuPlanningDTO = {
  cliente_id: string;
  fecha: Date;
  franja_id: string;
  ficha_id: string;
  num_raciones: number;
};

export type IngredientExplosionResult = {
  insumo_id: string;
  insumo_nombre: string;
  cantidad_total: number;
  unidad_medida: string;
  stock_disponible?: number;
  necesidad_compra?: number;
};