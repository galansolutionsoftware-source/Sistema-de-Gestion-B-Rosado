import { supabase } from '../supabase/client';
import type { IClientRepository } from '../../core/repositories';
import type { Client, CreateClientDTO } from '../../core/entities/Client';

function mapClient(row: any): Client {
  return {
    ...row,
    distancia_km:    Number(row.distancia_km ?? 0),
    frase_cartelera: row.frase_cartelera ?? '',
  };
}

export class SupabaseClientRepository implements IClientRepository {
  async findAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clientes').select('*').order('nombre_comercial');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapClient);
  }

  async findById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clientes').select('*').eq('id', id).single();
    if (error) return null;
    return mapClient(data);
  }

  async create(dto: CreateClientDTO): Promise<Client> {
    const { data, error } = await supabase
      .from('clientes').insert([{
        ...dto,
        distancia_km:   dto.distancia_km   ?? 0,
        frase_cartelera: dto.frase_cartelera ?? '',
      }]).select().single();
    if (error) throw new Error(error.message);
    return mapClient(data);
  }

  async update(id: string, dto: Partial<CreateClientDTO>): Promise<Client> {
    const { data, error } = await supabase
      .from('clientes').update(dto).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return mapClient(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
