// ============================================================
// ADAPTER: SupabaseSupplierRepository
// Now supports per-client suppliers
// ============================================================

import { supabase } from '../supabase/client';
import type { ISupplierRepository } from '../../core/repositories';
import type { Supplier, CreateSupplierDTO } from '../../core/entities/Supplier';

export class SupabaseSupplierRepository implements ISupplierRepository {
  async findAll(clientId?: string): Promise<Supplier[]> {
    let query = supabase
      .from('proveedores')
      .select('*')
      .order('razon_social');

    if (clientId) {
      query = query.eq('cliente_id', clientId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  async create(dto: CreateSupplierDTO): Promise<Supplier> {
    const { data, error } = await supabase
      .from('proveedores')
      .insert([{ ...dto, dias_credito: dto.dias_credito ?? 0 }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: Partial<CreateSupplierDTO>): Promise<Supplier> {
    const { data, error } = await supabase
      .from('proveedores')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('proveedores').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
