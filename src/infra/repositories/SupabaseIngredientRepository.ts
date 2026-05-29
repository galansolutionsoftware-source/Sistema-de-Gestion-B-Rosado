// ============================================================
// ADAPTER: SupabaseIngredientRepository
// Now supports per-client filtering
// ============================================================

import { supabase } from '../supabase/client';
import type { IIngredientRepository } from '../../core/repositories';
import type { Ingredient, CreateIngredientDTO } from '../../core/entities/Ingredient';

export class SupabaseIngredientRepository implements IIngredientRepository {
  async findAll(clientId?: string): Promise<Ingredient[]> {
    let query = supabase
      .from('insumos')
      .select('*, categorias_insumos (nombre)')
      .order('nombre');

    // Filter by client if provided
    if (clientId) {
      query = query.eq('cliente_id', clientId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data ?? []).map((item) => ({
      ...item,
      categoria_nombre: item.categorias_insumos?.nombre,
    }));
  }

  async findById(id: string): Promise<Ingredient | null> {
    const { data, error } = await supabase
      .from('insumos')
      .select('*, categorias_insumos (nombre)')
      .eq('id', id)
      .single();

    if (error) return null;
    return { ...data, categoria_nombre: data.categorias_insumos?.nombre };
  }

  async findByCategory(categoryId: string): Promise<Ingredient[]> {
    const { data, error } = await supabase
      .from('insumos')
      .select('*')
      .eq('categoria_id', categoryId)
      .order('nombre');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async create(dto: CreateIngredientDTO): Promise<Ingredient> {
    const { data, error } = await supabase
      .from('insumos')
      .insert([{ ...dto, precio_base: dto.precio_base ?? 0 }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: Partial<CreateIngredientDTO>): Promise<Ingredient> {
    const { data, error } = await supabase
      .from('insumos')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updatePrice(id: string, newPrice: number): Promise<Ingredient> {
    const { data, error } = await supabase
      .from('insumos')
      .update({ precio_base: newPrice })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('insumos').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
