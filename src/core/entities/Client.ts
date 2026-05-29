export type ClientType = 'UT' | 'COLEGIO' | 'RESTAURANTE' | 'UNIVERSIDAD' | 'EMPRESA';

export type Client = {
  id: string;
  nombre_comercial: string;
  tipo: ClientType;
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
  distancia_km: number;
  frase_cartelera: string;
  created_at: Date;
  updated_at: Date;
};

export type CreateClientDTO = {
  nombre_comercial: string;
  tipo: ClientType;
  nit: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  distancia_km?: number;
  frase_cartelera?: string;
};
