// ============================================================
// ADAPTER: SupabaseRecipeSheetRepository
// Bug fixes: removed broken Supabase column aliases in select()
// ============================================================

import { supabase } from '../supabase/client';
import type { IRecipeSheetRepository } from '../../core/repositories';
import type { RecipeSheet, CreateRecipeSheetDTO } from '../../core/entities/RecipeSheet';

const RECIPE_SELECT = `
  *,
  detalle_ficha_tecnica (
    id,
    insumo_id,
    gramaje_neto_por_racion,
    insumos ( nombre, unidad_medida, precio_base )
  )
`;

export class SupabaseRecipeSheetRepository implements IRecipeSheetRepository {
  async findAll(clientId?: string): Promise<RecipeSheet[]> {
    let query = supabase.from('fichas_tecnicas').select(RECIPE_SELECT);
    if (clientId) query = query.eq('cliente_id', clientId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data ?? []).map((item) => ({
      ...item,
      detalles: (item.detalle_ficha_tecnica ?? []).map((d: any) => ({
        id: d.id,
        insumo_id: d.insumo_id,
        gramaje_neto_por_racion: d.gramaje_neto_por_racion,
        insumo_nombre: d.insumos?.nombre,
      })),
    }));
  }

  async findById(id: string): Promise<RecipeSheet | null> {
    const { data, error } = await supabase
      .from('fichas_tecnicas')
      .select(RECIPE_SELECT)
      .eq('id', id)
      .single();

    if (error) return null;

    return {
      ...data,
      detalles: (data.detalle_ficha_tecnica ?? []).map((d: any) => ({
        id: d.id,
        insumo_id: d.insumo_id,
        gramaje_neto_por_racion: d.gramaje_neto_por_racion,
        insumo_nombre: d.insumos?.nombre,
      })),
    };
  }

  async create(dto: CreateRecipeSheetDTO): Promise<RecipeSheet> {
    // Step 1: Insert the recipe sheet header
    const { data: recipe, error: recipeError } = await supabase
      .from('fichas_tecnicas')
      .insert([{
        cliente_id: dto.cliente_id,
        nombre_plato: dto.nombre_plato,
        descripcion: dto.descripcion ?? '',
        costo_total_por_racion: 0,
      }])
      .select()
      .single();

    if (recipeError) throw new Error(recipeError.message);

    // Step 2: Insert detail lines
    if (dto.detalles?.length) {
      const details = dto.detalles.map((d) => ({
        ficha_id: recipe.id,
        insumo_id: d.insumo_id,
        gramaje_neto_por_racion: d.gramaje_neto_por_racion,
      }));

      const { error: detailsError } = await supabase
        .from('detalle_ficha_tecnica')
        .insert(details);

      if (detailsError) throw new Error(detailsError.message);
    }

    // Step 3: Recalculate and persist the total cost
    const totalCost = await this.calculateTotalCost(recipe.id);
    await supabase
      .from('fichas_tecnicas')
      .update({ costo_total_por_racion: totalCost })
      .eq('id', recipe.id);

    return this.findById(recipe.id) as Promise<RecipeSheet>;
  }

  async update(id: string, dto: Partial<CreateRecipeSheetDTO>): Promise<RecipeSheet> {
    // Update header fields
    const updateFields: Record<string, unknown> = {};
    if (dto.nombre_plato) updateFields.nombre_plato = dto.nombre_plato;
    if (dto.descripcion !== undefined) updateFields.descripcion = dto.descripcion;

    if (Object.keys(updateFields).length) {
      const { error } = await supabase
        .from('fichas_tecnicas')
        .update(updateFields)
        .eq('id', id);
      if (error) throw new Error(error.message);
    }

    // Replace detail lines if provided
    if (dto.detalles) {
      await supabase.from('detalle_ficha_tecnica').delete().eq('ficha_id', id);

      const newDetails = dto.detalles.map((d) => ({
        ficha_id: id,
        insumo_id: d.insumo_id,
        gramaje_neto_por_racion: d.gramaje_neto_por_racion,
      }));

      const { error: detailsError } = await supabase
        .from('detalle_ficha_tecnica')
        .insert(newDetails);
      if (detailsError) throw new Error(detailsError.message);
    }

    // Recalculate cost
    const newCost = await this.calculateTotalCost(id);
    await supabase
      .from('fichas_tecnicas')
      .update({ costo_total_por_racion: newCost })
      .eq('id', id);

    return this.findById(id) as Promise<RecipeSheet>;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('fichas_tecnicas').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async calculateTotalCost(recipeId: string): Promise<number> {
    const { data, error } = await supabase
      .from('detalle_ficha_tecnica')
      .select('gramaje_neto_por_racion, insumos ( precio_base, unidad_medida )')
      .eq('ficha_id', recipeId);

    if (error) throw new Error(error.message);

    let total = 0;
    for (const detail of data ?? []) {
      const price: number = (detail.insumos as any)?.precio_base ?? 0;
      const grams: number = detail.gramaje_neto_por_racion;
      const unit: string = (detail.insumos as any)?.unidad_medida ?? 'UNIDADES';

      if (unit === 'KILOGRAMOS' || unit === 'GRAMOS') {
        total += (grams / 1000) * price;
      } else {
        total += grams * price;
      }
    }

    return parseFloat(total.toFixed(2));
  }
}
