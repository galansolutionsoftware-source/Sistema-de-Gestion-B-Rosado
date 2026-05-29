import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, AlertTriangle, Search, Save } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useClient } from '../../contexts/ClientContext';
import { SupabaseInventoryRepository } from '../../../infra/repositories/SupabaseInventoryRepository';
import toast from 'react-hot-toast';

const repo = new SupabaseInventoryRepository();

export const InventoryPage: React.FC = () => {
  const { currentClient } = useClient();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  // Map of insumo_id → edited stock value
  const [editMap, setEditMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: stock = [], isLoading } = useQuery({
    queryKey: ['inventory-stock', currentClient?.id],
    queryFn: () => repo.getAllStock(currentClient!.id),
    enabled: !!currentClient,
    // Refetch automatically when window regains focus
    refetchOnWindowFocus: true,
  });

  const filteredStock = stock.filter(s =>
    (s.insumo_nombre ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = stock.filter(s => s.stock_actual <= 0);

  const handleEditChange = (insumoId: string, value: string) => {
    setEditMap(prev => ({ ...prev, [insumoId]: value }));
  };

  const handleSaveAll = async () => {
    const entries = Object.entries(editMap).filter(([, v]) => v !== '' && !isNaN(Number(v)));
    if (entries.length === 0) {
      toast('No hay cambios de stock pendientes', { icon: 'ℹ️' });
      return;
    }
    setSaving(true);
    try {
      for (const [insumoId, val] of entries) {
        const newStock = parseFloat(val);
        await repo.setStock(currentClient!.id, insumoId, newStock);
      }
      qc.invalidateQueries({ queryKey: ['inventory-stock'] });
      setEditMap({});
      toast.success(`${entries.length} ítem(s) de stock actualizados`);
    } catch (e: any) {
      toast.error(e.message ?? 'Error al guardar stock');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOne = async (insumoId: string) => {
    const val = editMap[insumoId];
    if (val === undefined || val === '' || isNaN(Number(val))) {
      toast.error('Ingresa un valor de stock válido');
      return;
    }
    setSaving(true);
    try {
      await repo.setStock(currentClient!.id, insumoId, parseFloat(val));
      qc.invalidateQueries({ queryKey: ['inventory-stock'] });
      setEditMap(prev => { const n = { ...prev }; delete n[insumoId]; return n; });
      toast.success('Stock actualizado');
    } catch (e: any) {
      toast.error(e.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = Object.values(editMap).filter(v => v !== '' && !isNaN(Number(v))).length;

  if (!currentClient) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Inventario / Bodega</h2>
        <Card>
          <div className="text-center py-16">
            <Package size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">Selecciona un cliente para ver su inventario.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Inventario / Bodega</h2>
          <p className="text-gray-500 text-sm mt-1">{currentClient.nombre_comercial}</p>
        </div>
        {pendingCount > 0 && (
          <Button onClick={handleSaveAll} loading={saving}>
            <Save size={15} className="mr-1" /> Guardar {pendingCount} cambio{pendingCount !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Ítems en bodega</p>
              <p className="text-2xl font-bold text-gray-900">{stock.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${lowStock.length > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertTriangle size={20} className={lowStock.length > 0 ? 'text-red-600' : 'text-gray-400'} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Sin stock (= 0)</p>
              <p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStock.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Save size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Cambios pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Buscador */}
      <div className="mb-4 flex items-center gap-2 max-w-sm">
        <Search size={16} className="text-gray-400" />
        <Input placeholder="Buscar insumo..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Instrucciones */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <strong>Stock manual:</strong> Escribe el nuevo valor de stock en el campo correspondiente y haz clic en <strong>Guardar</strong> individual o usa el botón superior para guardar todos los cambios de una vez. Esto no afecta las órdenes de compra existentes.
      </div>

      {/* Tabla */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="text-center py-12">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 font-medium">
              {stock.length === 0 ? 'No hay stock registrado.' : 'Ningún insumo coincide.'}
            </p>
            {stock.length === 0 && (
              <p className="text-gray-400 text-sm mt-1">
                El stock se ingresa al recibir una Orden de Compra, o puedes ajustarlo manualmente aquí.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Insumo', 'Stock Actual', 'Nuevo Stock', 'Unidad', 'Última Actualización', 'Estado', ''].map(h => (
                    <th key={h} className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStock.map(s => {
                  const isEmpty = s.stock_actual <= 0;
                  const insumoData = s as any;
                  const unidad = insumoData.insumos?.unidad_medida ?? '';
                  const editVal = editMap[s.insumo_id];
                  const hasEdit = editVal !== undefined && editVal !== '';

                  return (
                    <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isEmpty ? 'bg-red-50' : ''} ${hasEdit ? 'bg-yellow-50' : ''}`}>
                      <td className="p-3 text-sm font-medium text-gray-900">{s.insumo_nombre ?? '—'}</td>
                      <td className="p-3 text-sm font-bold text-gray-800">
                        {Number(s.stock_actual).toLocaleString('es-CO', { maximumFractionDigits: 3 })}
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          value={editVal ?? ''}
                          onChange={e => handleEditChange(s.insumo_id, e.target.value)}
                          placeholder="Nuevo valor"
                          className="w-32"
                        />
                      </td>
                      <td className="p-3 text-sm text-gray-500">{unidad}</td>
                      <td className="p-3 text-sm text-gray-500">
                        {format(new Date(s.ultima_actualizacion), "dd/MM/yyyy HH:mm", { locale: es })}
                      </td>
                      <td className="p-3">
                        {isEmpty ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                            <AlertTriangle size={10} /> Sin stock
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Disponible</span>
                        )}
                      </td>
                      <td className="p-3">
                        {hasEdit && (
                          <Button size="sm" onClick={() => handleSaveOne(s.insumo_id)} loading={saving}>
                            <Save size={12} className="mr-1" /> Guardar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
