export type MeasureUnit = 'GRAMOS' | 'KILOGRAMOS' | 'LITROS' | 'UNIDADES' | 'MILILITROS' | 'LIBRAS';
export type IngredientCategory = 'MATERIAS_PRIMAS' | 'PRODUCTOS_ASEO' | 'DESECHABLES' | 'CONDIMENTOS';

export type Ingredient = {
  id: string;
  codigo: string;
  nombre: string;
  categoria_id: string;
  categoria_nombre?: IngredientCategory;
  unidad_medida: MeasureUnit;
  precio_base: number;    // precio por unidad base (por kg, por und, por L, etc.)
  cliente_id?: string;    // ahora puede ser por cliente
  created_at: Date;
  updated_at: Date;
};

export type CreateIngredientDTO = {
  codigo: string;
  nombre: string;
  categoria_id: string;
  unidad_medida: MeasureUnit;
  precio_base?: number;
  cliente_id?: string;
};
