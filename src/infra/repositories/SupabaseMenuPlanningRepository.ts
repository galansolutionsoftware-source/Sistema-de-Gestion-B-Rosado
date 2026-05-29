import { supabase } from '../supabase/client';
import type { IMenuPlanningRepository } from '../../core/repositories';
import type {
  MenuPlanning,
  CreateMenuPlanningDTO,
  IngredientExplosionResult,
} from '../../core/entities/MenuPlanning';

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export class SupabaseMenuPlanningRepository implements IMenuPlanningRepository {
  async findByDateRange(clientId: string, startDate: Date, endDate: Date): Promise<MenuPlanning[]> {
    const { data, error } = await supabase
      .from('planificacion_menus')
      .select('*, franjas_servicio ( nombre ), fichas_tecnicas ( nombre_plato )')
      .eq('cliente_id', clientId)
      .gte('fecha', toLocalDateStr(startDate))
      .lte('fecha', toLocalDateStr(endDate))
      .order('fecha');

    if (error) throw new Error(error.message);

    return (data ?? []).map((item) => ({
      ...item,
      // fecha kept as yyyy-MM-dd string for safe local comparison
      franja_nombre: (item.franjas_servicio as any)?.nombre,
      ficha_nombre: (item.fichas_tecnicas as any)?.nombre_plato,
    }));
  }

  async create(dto: CreateMenuPlanningDTO): Promise<MenuPlanning> {
    // Always store the local date string to avoid UTC offset desfase
    const fechaStr = dto.fecha instanceof Date
      ? toLocalDateStr(dto.fecha)
      : dto.fecha;

    const { data, error } = await supabase
      .from('planificacion_menus')
      .insert([{
        cliente_id:   dto.cliente_id,
        fecha:        fechaStr,
        franja_id:    dto.franja_id,
        ficha_id:     dto.ficha_id,
        num_raciones: dto.num_raciones,
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: Partial<CreateMenuPlanningDTO>): Promise<MenuPlanning> {
    const updateFields: Record<string, unknown> = {};
    if (dto.fecha) {
      updateFields.fecha = dto.fecha instanceof Date
        ? toLocalDateStr(dto.fecha)
        : dto.fecha;
    }
    if (dto.franja_id)    updateFields.franja_id    = dto.franja_id;
    if (dto.ficha_id)     updateFields.ficha_id     = dto.ficha_id;
    if (dto.num_raciones) updateFields.num_raciones  = dto.num_raciones;

    const { data, error } = await supabase
      .from('planificacion_menus')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('planificacion_menus').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async explodeIngredients(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IngredientExplosionResult[]> {
    const plannings = await this.findByDateRange(clientId, startDate, endDate);
    if (!plannings.length) return [];

    const recipeIds = [...new Set(plannings.map((p) => p.ficha_id))];
    const { data: recipes, error } = await supabase
      .from('fichas_tecnicas')
      .select('id, detalle_ficha_tecnica ( insumo_id, gramaje_neto_por_racion, insumos ( nombre, unidad_medida ) )')
      .in('id', recipeIds);

    if (error) throw new Error(error.message);

    const recipeMap = new Map<string, any[]>();
    recipes?.forEach((r) => {
      recipeMap.set(r.id, (r.detalle_ficha_tecnica as any[]) ?? []);
    });

    const explosionMap = new Map<string, IngredientExplosionResult>();

    for (const plan of plannings) {
      const details = recipeMap.get(plan.ficha_id) ?? [];
      for (const detail of details) {
        const qty = detail.gramaje_neto_por_racion * plan.num_raciones;
        const id = detail.insumo_id;

        if (explosionMap.has(id)) {
          explosionMap.get(id)!.cantidad_total += qty;
        } else {
          explosionMap.set(id, {
            insumo_id: id,
            insumo_nombre: (detail.insumos as any)?.nombre ?? 'Unknown',
            cantidad_total: qty,
            unidad_medida: (detail.insumos as any)?.unidad_medida ?? 'UNIDADES',
          });
        }
      }
    }

    return Array.from(explosionMap.values());
  }
}
