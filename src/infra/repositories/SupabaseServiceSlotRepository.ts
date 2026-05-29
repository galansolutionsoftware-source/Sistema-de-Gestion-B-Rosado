// ============================================================
// ADAPTER: SupabaseServiceSlotRepository
// Fetches service time slots (breakfast, lunch, dinner, etc.)
// ============================================================

import { supabase } from '../supabase/client';

export interface ServiceSlotRecord {
  id: string;
  nombre: string;
  orden: number;
}

export class SupabaseServiceSlotRepository {
  async findAll(): Promise<ServiceSlotRecord[]> {
    const { data, error } = await supabase
      .from('franjas_servicio')
      .select('*')
      .order('orden');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findById(id: string): Promise<ServiceSlotRecord | null> {
    const { data, error } = await supabase
      .from('franjas_servicio')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }
}
