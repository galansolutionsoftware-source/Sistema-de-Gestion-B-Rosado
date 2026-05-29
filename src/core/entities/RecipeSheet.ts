export type RecipeSheetDetail = {
  id: string;
  insumo_id: string;
  insumo_nombre?: string;
  gramaje_neto_por_racion: number;
};

export type RecipeSheet = {
  id: string;
  cliente_id: string;
  nombre_plato: string;
  descripcion: string;
  costo_total_por_racion: number;
  detalles: RecipeSheetDetail[];
  created_at: Date;
  updated_at: Date;
};

export type CreateRecipeSheetDTO = {
  cliente_id: string;
  nombre_plato: string;
  descripcion?: string;
  detalles: Omit<RecipeSheetDetail, 'id'>[];
};