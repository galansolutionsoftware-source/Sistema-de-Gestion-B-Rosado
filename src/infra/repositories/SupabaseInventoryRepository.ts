import { supabase } from '../supabase/client';
import type { IInventoryRepository } from '../../core/repositories';
import type { Inventory, InventoryMovement } from '../../core/entities/Inventory';

export class SupabaseInventoryRepository implements IInventoryRepository {
  async getStock(clientId: string, ingredientId: string): Promise<number> {
    const { data, error } = await supabase
      .from('inventario')
      .select('stock_actual')
      .eq('cliente_id', clientId)
      .eq('insumo_id', ingredientId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data?.stock_actual ?? 0;
  }

  async getAllStock(clientId: string): Promise<Inventory[]> {
    const { data, error } = await supabase
      .from('inventario')
      .select('*, insumos ( nombre, unidad_medida, codigo )')
      .eq('cliente_id', clientId);

    if (error) throw new Error(error.message);

    return (data ?? []).map((item) => ({
      ...item,
      insumo_nombre: (item.insumos as any)?.nombre,
    }));
  }

  // Manual stock set — does NOT create a movement entry (pure admin adjustment)
  async setStock(clientId: string, ingredientId: string, newStock: number): Promise<void> {
    const { error } = await supabase.from('inventario').upsert(
      {
        cliente_id:           clientId,
        insumo_id:            ingredientId,
        stock_actual:         newStock,
        ultima_actualizacion: new Date().toISOString(),
      },
      { onConflict: 'cliente_id,insumo_id' },
    );
    if (error) throw new Error(error.message);
  }

  async registerEntry(
    clientId: string,
    ingredientId: string,
    quantity: number,
    referenceId: string,
  ): Promise<void> {
    const currentStock = await this.getStock(clientId, ingredientId);

    const { error: upsertError } = await supabase.from('inventario').upsert(
      {
        cliente_id:           clientId,
        insumo_id:            ingredientId,
        stock_actual:         currentStock + quantity,
        ultima_actualizacion: new Date().toISOString(),
      },
      { onConflict: 'cliente_id,insumo_id' },
    );
    if (upsertError) throw new Error(upsertError.message);

    const { error: movError } = await supabase.from('movimientos_inventario').insert([{
      cliente_id:   clientId,
      insumo_id:    ingredientId,
      tipo:         'ENTRADA',
      cantidad:     quantity,
      referencia_id: referenceId,
      fecha:        new Date().toISOString(),
      descripcion:  `Entrada por orden de compra: ${referenceId}`,
    }]);
    if (movError) throw new Error(movError.message);
  }

  async registerExit(
    clientId: string,
    ingredientId: string,
    quantity: number,
    referenceId: string,
  ): Promise<void> {
    const currentStock = await this.getStock(clientId, ingredientId);
    if (currentStock < quantity) {
      throw new Error(`Stock insuficiente. Disponible: ${currentStock}, Requerido: ${quantity}`);
    }

    const { error: updateError } = await supabase
      .from('inventario')
      .update({ stock_actual: currentStock - quantity, ultima_actualizacion: new Date().toISOString() })
      .eq('cliente_id', clientId)
      .eq('insumo_id', ingredientId);
    if (updateError) throw new Error(updateError.message);

    const { error: movError } = await supabase.from('movimientos_inventario').insert([{
      cliente_id:   clientId,
      insumo_id:    ingredientId,
      tipo:         'SALIDA',
      cantidad:     quantity,
      referencia_id: referenceId,
      fecha:        new Date().toISOString(),
      descripcion:  `Salida por planificación: ${referenceId}`,
    }]);
    if (movError) throw new Error(movError.message);
  }

  async getMovements(
    clientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<InventoryMovement[]> {
    let query = supabase
      .from('movimientos_inventario')
      .select('*, insumos ( nombre, codigo, unidad_medida )')
      .eq('cliente_id', clientId)
      .order('fecha', { ascending: false });

    if (startDate) query = query.gte('fecha', startDate.toISOString());
    if (endDate)   query = query.lte('fecha', endDate.toISOString());

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
