import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Building2, School, UtensilsCrossed, GraduationCap, Briefcase } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useClient } from '../../contexts/ClientContext';
import { SupabaseClientRepository } from '../../../infra/repositories/SupabaseClientRepository';
import type { Client, CreateClientDTO, ClientType } from '../../../core/entities/Client';

const repo = new SupabaseClientRepository();

const TYPE_LABELS: Record<ClientType, string> = {
  UT:          'Unión Temporal',
  COLEGIO:     'Colegio',
  RESTAURANTE: 'Restaurante',
  UNIVERSIDAD: 'Universidad',
  EMPRESA:     'Empresa',
};
const TYPE_ICONS: Record<ClientType, React.ReactNode> = {
  UT:          <Briefcase      size={14} />,
  COLEGIO:     <School         size={14} />,
  RESTAURANTE: <UtensilsCrossed size={14} />,
  UNIVERSIDAD: <GraduationCap  size={14} />,
  EMPRESA:     <Building2      size={14} />,
};
const TYPE_COLORS: Record<ClientType, string> = {
  UT:          'bg-blue-100   text-blue-700',
  COLEGIO:     'bg-green-100  text-green-700',
  RESTAURANTE: 'bg-orange-100 text-orange-700',
  UNIVERSIDAD: 'bg-purple-100 text-purple-700',
  EMPRESA:     'bg-gray-100   text-gray-700',
};

const emptyForm: CreateClientDTO = {
  nombre_comercial: '',
  tipo:             'COLEGIO',
  nit:              '',
  direccion:        '',
  telefono:         '',
  email:            '',
  distancia_km:     0,
  frase_cartelera:  '',
};

export const ClientsPage: React.FC = () => {
  const qc = useQueryClient();
  const { refreshClients } = useClient();
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<Client | null>(null);
  const [form,      setForm]      = useState<CreateClientDTO>(emptyForm);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn:  () => repo.findAll(),
  });

  const createMut = useMutation({
    mutationFn: (d: CreateClientDTO) => repo.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      refreshClients();
      toast.success('Cliente creado');
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<CreateClientDTO> }) => repo.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      refreshClients();
      toast.success('Cliente actualizado');
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      refreshClients();
      toast.success('Cliente eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit   = (c: Client) => {
    setEditing(c);
    setForm({
      nombre_comercial: c.nombre_comercial,
      tipo:             c.tipo,
      nit:              c.nit,
      direccion:        c.direccion,
      telefono:         c.telefono,
      email:            c.email,
      distancia_km:     c.distancia_km,
      frase_cartelera:  c.frase_cartelera,
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = () => {
    if (!form.nombre_comercial || !form.nit) { toast.error('Nombre y NIT son obligatorios'); return; }
    if (editing) updateMut.mutate({ id: editing.id, d: form });
    else         createMut.mutate(form);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
          <p className="text-gray-500 text-sm mt-1">{clients.length} cliente{clients.length !== 1 ? 's' : ''} registrado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate}><Plus size={17} className="mr-2" />Nuevo Cliente</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : clients.length === 0 ? (
        <Card><div className="text-center py-12"><Building2 size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-400">No hay clientes. Crea el primero.</p><Button className="mt-4" onClick={openCreate}>Crear primer cliente</Button></div></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map(c => (
            <Card key={c.id}>
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[c.tipo]}`}>
                  {TYPE_ICONS[c.tipo]} {TYPE_LABELS[c.tipo]}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm(`¿Eliminar "${c.nombre_comercial}"?`)) deleteMut.mutate(c.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">{c.nombre_comercial}</h3>
              <p className="text-sm text-gray-500 mb-3">NIT: {c.nit}</p>
              <div className="space-y-1 text-xs text-gray-400">
                {c.telefono   && <p>📞 {c.telefono}</p>}
                {c.email      && <p>✉️ {c.email}</p>}
                {c.direccion  && <p>📍 {c.direccion}</p>}
                {c.distancia_km > 0 && (
                  <p className="text-blue-600 font-medium">🚚 {c.distancia_km} km desde bodega</p>
                )}
                {c.frase_cartelera && (
                  <p className="italic text-gray-400 border-t border-gray-100 pt-1 mt-1">"{c.frase_cartelera}"</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial *</label>
                  <Input value={form.nombre_comercial} onChange={e => setForm({...form, nombre_comercial: e.target.value})} placeholder="Colegio San José" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value as ClientType})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {(Object.keys(TYPE_LABELS) as ClientType[]).map(t => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIT / Cédula *</label>
                  <Input value={form.nit} onChange={e => setForm({...form, nit: e.target.value})} placeholder="900.123.456-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <Input value={form.telefono ?? ''} onChange={e => setForm({...form, telefono: e.target.value})} placeholder="300 000 0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input type="email" value={form.email ?? ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="correo@cliente.com" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <Input value={form.direccion ?? ''} onChange={e => setForm({...form, direccion: e.target.value})} placeholder="Calle 123 # 45-67" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distancia desde bodega (km)</label>
                  <Input type="number" min="0" step="0.1" value={form.distancia_km ?? 0} onChange={e => setForm({...form, distancia_km: parseFloat(e.target.value) || 0})} placeholder="0.0" />
                  <p className="text-xs text-gray-400 mt-0.5">Se usa para calcular el flete por cliente</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frase para cartelera</label>
                <textarea
                  value={form.frase_cartelera ?? ''}
                  onChange={e => setForm({...form, frase_cartelera: e.target.value})}
                  placeholder="Frase célebre o texto institucional que aparece en la cartelera impresa…"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex gap-3 justify-end">
              <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
              <Button onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending}>
                {editing ? 'Guardar Cambios' : 'Crear Cliente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
