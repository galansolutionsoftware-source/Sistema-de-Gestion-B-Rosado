import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Truck, CreditCard } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useClient } from '../../contexts/ClientContext';
import { SupabaseSupplierRepository } from '../../../infra/repositories/SupabaseSupplierRepository';
import type { Supplier, CreateSupplierDTO } from '../../../core/entities/Supplier';

const repo = new SupabaseSupplierRepository();

const makeEmpty = (): CreateSupplierDTO => ({
  razon_social: '', nit: '', banco: '', tipo_cuenta: 'AHORROS',
  numero_cuenta: '', dias_credito: 0, telefono: '', productos_que_vende: '',
});

export const SuppliersPage: React.FC = () => {
  const { currentClient } = useClient();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Supplier | null>(null);
  const [form, setForm]           = useState<CreateSupplierDTO>(makeEmpty());
  const [search, setSearch]       = useState('');

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', currentClient?.id],
    queryFn: () => repo.findAll(currentClient?.id),
    enabled: !!currentClient,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateSupplierDTO) => repo.create({ ...data, cliente_id: currentClient?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Proveedor creado'); closeModal(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateSupplierDTO> }) => repo.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Proveedor actualizado'); closeModal(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Proveedor eliminado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => { setEditing(null); setForm(makeEmpty()); setShowModal(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ razon_social: s.razon_social, nit: s.nit, banco: s.banco, tipo_cuenta: s.tipo_cuenta, numero_cuenta: s.numero_cuenta, dias_credito: s.dias_credito, telefono: s.telefono ?? '', productos_que_vende: s.productos_que_vende ?? '' });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(makeEmpty()); };

  const handleSubmit = () => {
    if (!form.razon_social || !form.nit) { toast.error('Razón social y NIT son obligatorios'); return; }
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else         createMut.mutate(form);
  };

  const filtered = suppliers.filter(s =>
    s.razon_social.toLowerCase().includes(search.toLowerCase()) || s.nit.includes(search)
  );

  if (!currentClient) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Proveedores</h2>
        <Card><div className="text-center py-16"><Truck size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-400">Selecciona un cliente para ver sus proveedores.</p></div></Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Proveedores</h2>
          <p className="text-gray-500 text-sm mt-1">{currentClient.nombre_comercial} — {suppliers.length} proveedor{suppliers.length !== 1 ? 'es' : ''}</p>
        </div>
        <Button onClick={openCreate}><Plus size={18} className="mr-2" />Nuevo Proveedor</Button>
      </div>

      <div className="mb-4">
        <Input placeholder="Buscar por nombre o NIT..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Truck size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay proveedores {search ? 'que coincidan' : 'registrados para este cliente'}.</p>
            {!search && <Button className="mt-4" onClick={openCreate}>Crear primer proveedor</Button>}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(s => (
            <Card key={s.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center"><Truck size={20} className="text-indigo-600" /></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.razon_social}</h3>
                    <p className="text-sm text-gray-500">NIT: {s.nit}</p>
                    {s.telefono && <p className="text-xs text-gray-400">📞 {s.telefono}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil size={15} /></button>
                  <button onClick={() => { if (confirm(`¿Eliminar "${s.razon_social}"?`)) deleteMut.mutate(s.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-600">{s.banco} — {s.tipo_cuenta} {s.numero_cuenta}</span>
                </div>
                {s.productos_que_vende && <p className="text-xs text-gray-500 mb-2">🛒 {s.productos_que_vende}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Días de crédito</span>
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${s.dias_credito > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.dias_credito} días</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <p className="text-xs text-gray-400 mt-1">Para: {currentClient.nombre_comercial}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social / Nombre *</label>
                <Input value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} placeholder="Distribuidora XYZ S.A.S." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIT / Cédula *</label>
                  <Input value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} placeholder="900.123.456-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <Input value={form.telefono ?? ''} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="300 123 4567" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Productos que vende</label>
                <Input value={form.productos_que_vende ?? ''} onChange={e => setForm({ ...form, productos_que_vende: e.target.value })} placeholder="Carnes, lácteos, verduras…" />
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><CreditCard size={16} />Información Bancaria</p>
                <div className="space-y-3">
                  <Input placeholder="Banco (Bancolombia, Davivienda…)" value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={form.tipo_cuenta} onChange={e => setForm({ ...form, tipo_cuenta: e.target.value as 'AHORROS' | 'CORRIENTE' })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="AHORROS">Ahorros</option>
                      <option value="CORRIENTE">Corriente</option>
                    </select>
                    <Input placeholder="Número de cuenta" value={form.numero_cuenta} onChange={e => setForm({ ...form, numero_cuenta: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Días de Crédito</label>
                    <Input type="number" value={form.dias_credito ?? 0} onChange={e => setForm({ ...form, dias_credito: parseInt(e.target.value) || 0 })} placeholder="0" />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
              <Button onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending}>
                {editing ? 'Guardar Cambios' : 'Crear Proveedor'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
