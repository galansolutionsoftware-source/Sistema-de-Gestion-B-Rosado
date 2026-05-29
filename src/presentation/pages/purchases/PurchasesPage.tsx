import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, X, CheckCircle, Package, Eye, ShoppingCart, Truck, Pencil } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useClient } from '../../contexts/ClientContext';
import { SupabasePurchaseOrderRepository } from '../../../infra/repositories/SupabasePurchaseOrderRepository';
import { SupabaseSupplierRepository }      from '../../../infra/repositories/SupabaseSupplierRepository';
import { SupabaseIngredientRepository }    from '../../../infra/repositories/SupabaseIngredientRepository';
import { SupabaseAccountPayableRepository } from '../../../infra/repositories/SupabaseAccountPayableRepository';
import { SupabaseInventoryRepository }     from '../../../infra/repositories/SupabaseInventoryRepository';
import type { PurchaseOrder, OrderStatus } from '../../../core/entities/PurchaseOrder';
import type { Ingredient } from '../../../core/entities/Ingredient';

const orderRepo    = new SupabasePurchaseOrderRepository();
const supplierRepo = new SupabaseSupplierRepository();
const ingRepo      = new SupabaseIngredientRepository();
const accountRepo  = new SupabaseAccountPayableRepository();
const inventoryRepo = new SupabaseInventoryRepository();

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDIENTE: 'Pendiente', APROBADA: 'Aprobada',
  RECIBIDA:  'Recibida',  CANCELADA: 'Cancelada',
};
const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-700',
  APROBADA:  'bg-blue-100   text-blue-700',
  RECIBIDA:  'bg-green-100  text-green-700',
  CANCELADA: 'bg-red-100    text-red-700',
};

type Line = { insumo_id: string; cantidad: number; precio_unitario: number };

const fmt = (n: number) => `$${Number(n).toLocaleString('es-CO')}`;

export const PurchasesPage: React.FC = () => {
  const { currentClient } = useClient();
  const qc = useQueryClient();

  // Modal crear
  const [showModal,    setShowModal]    = useState(false);
  const [supplierId,   setSupplierId]   = useState('');
  const [valorDomicilio, setValorDomicilio] = useState(0);
  const [notas,        setNotas]        = useState('');
  const [lines,        setLines]        = useState<Line[]>([{ insumo_id: '', cantidad: 0, precio_unitario: 0 }]);

  // Modal ver detalle
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);

  // Modal editar orden
  const [editOrder, setEditOrder] = useState<PurchaseOrder | null>(null);
  const [editLines, setEditLines] = useState<Line[]>([]);
  const [editNotas, setEditNotas] = useState('');
  const [editDomicilio, setEditDomicilio] = useState(0);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', currentClient?.id],
    queryFn:  () => orderRepo.findAll(currentClient?.id),
    enabled:  !!currentClient,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', currentClient?.id],
    queryFn: () => supplierRepo.findAll(currentClient?.id),
    enabled: !!currentClient,
  });
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients', currentClient?.id],
    queryFn: () => ingRepo.findAll(currentClient?.id),
    enabled: !!currentClient,
  });

  const ingMap = React.useMemo(() => {
    const m = new Map<string, Ingredient>();
    ingredients.forEach(i => m.set(i.id, i));
    return m;
  }, [ingredients]);

  const setLineIng = (idx: number, id: string) => {
    const ing = ingMap.get(id);
    setLines(prev => {
      const nl = [...prev];
      nl[idx] = { ...nl[idx], insumo_id: id, precio_unitario: ing?.precio_base ?? nl[idx].precio_unitario };
      return nl;
    });
  };

  const setEditLineIng = (idx: number, id: string) => {
    const ing = ingMap.get(id);
    setEditLines(prev => {
      const nl = [...prev];
      nl[idx] = { ...nl[idx], insumo_id: id, precio_unitario: ing?.precio_base ?? nl[idx].precio_unitario };
      return nl;
    });
  };

  const createMut = useMutation({
    mutationFn: async () => {
      if (!currentClient) throw new Error('Selecciona un cliente');
      if (!supplierId)    throw new Error('Selecciona un proveedor');
      const valid = lines.filter(l => l.insumo_id && l.cantidad > 0 && l.precio_unitario >= 0);
      if (!valid.length)  throw new Error('Agrega al menos una línea válida');
      return orderRepo.create({
        proveedor_id: supplierId, cliente_id: currentClient.id,
        valor_domicilio: valorDomicilio, notas,
        detalles: valid,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      // Actualizar precio en insumos maestro si cambió
      qc.invalidateQueries({ queryKey: ['ingredients'] });
      toast.success('Orden creada');
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutación para editar orden PENDIENTE
  const editMut = useMutation({
    mutationFn: async () => {
      if (!editOrder) throw new Error('No hay orden seleccionada');
      const valid = editLines.filter(l => l.insumo_id && l.cantidad > 0 && l.precio_unitario >= 0);
      if (!valid.length) throw new Error('Agrega al menos una línea válida');

      // Actualizar precio_base de insumos si cambió
      for (const line of valid) {
        const ing = ingMap.get(line.insumo_id);
        if (ing && ing.precio_base !== line.precio_unitario) {
          await ingRepo.updatePrice(line.insumo_id, line.precio_unitario);
        }
      }

      return orderRepo.updateOrder(editOrder.id, {
        valor_domicilio: editDomicilio,
        notas: editNotas,
        detalles: valid,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['ingredients'] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Orden actualizada — precios de insumos sincronizados');
      setEditOrder(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMut = useMutation({
    mutationFn: async (id: string) => {
      await orderRepo.updateStatus(id, 'APROBADA');
      await accountRepo.createFromOrder(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Orden aprobada — CxP generada automáticamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const receiveMut = useMutation({
    mutationFn: async (o: PurchaseOrder) => {
      await orderRepo.updateStatus(o.id, 'RECIBIDA');
      for (const d of o.detalles) {
        await inventoryRepo.registerEntry(o.cliente_id, d.insumo_id, d.cantidad, o.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['inventory-stock'] });
      toast.success('Recibido en bodega — inventario actualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => orderRepo.updateStatus(id, 'CANCELADA'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Orden cancelada'); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const closeModal = () => {
    setShowModal(false); setSupplierId(''); setValorDomicilio(0); setNotas('');
    setLines([{ insumo_id: '', cantidad: 0, precio_unitario: 0 }]);
  };

  const openEdit = (o: PurchaseOrder) => {
    setEditOrder(o);
    setEditLines(o.detalles.map(d => ({ insumo_id: d.insumo_id, cantidad: d.cantidad, precio_unitario: d.precio_unitario })));
    setEditNotas(o.notas ?? '');
    setEditDomicilio(o.valor_domicilio ?? 0);
  };

  const subtotalProductos = lines.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0);
  const totalConDomicilio = subtotalProductos + valorDomicilio;
  const editSubtotal = editLines.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0);
  const editTotal    = editSubtotal + editDomicilio;

  if (!currentClient) return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Órdenes de Compra</h2>
      <Card><div className="text-center py-16"><ShoppingCart size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-400">Selecciona un cliente para gestionar sus compras.</p></div></Card>
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Órdenes de Compra</h2>
          <p className="text-gray-500 text-sm">{currentClient.nombre_comercial}</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus size={17} className="mr-2" />Nueva Orden</Button>
      </div>

      <div className="mb-5 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <strong>Flujo:</strong> Crear → <strong>Editar</strong> (si necesitas ajustar) → <strong>Aprobar</strong> (genera CxP) → <strong>Recibir en Bodega</strong> (actualiza inventario)
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : orders.length === 0 ? (
        <Card><div className="text-center py-12"><Package size={48} className="mx-auto text-gray-300 mb-4" /><p className="text-gray-400">No hay órdenes de compra.</p></div></Card>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Card key={o.id}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.estado]}`}>{STATUS_LABELS[o.estado]}</span>
                    <span className="text-xs text-gray-400">{format(new Date(o.fecha_emision), 'dd MMM yyyy', { locale: es })}</span>
                  </div>
                  <p className="font-semibold text-gray-900">{o.proveedor_nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{o.detalles.length} ítem(s)</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-right text-xs text-gray-500">
                    <p>Productos: <span className="font-medium">{fmt(o.subtotal_productos)}</span></p>
                    {o.valor_domicilio > 0 && <p className="text-orange-600">+ Domicilio: <span className="font-medium">{fmt(o.valor_domicilio)}</span></p>}
                  </div>
                  <span className="text-lg font-bold text-gray-900">{fmt(o.total)}</span>

                  {/* Botón ver detalle */}
                  <button onClick={() => setViewOrder(o)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Ver detalle"><Eye size={16} /></button>

                  {/* Botón editar — disponible para PENDIENTE */}
                  {o.estado === 'PENDIENTE' && (
                    <button onClick={() => openEdit(o)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Editar orden"><Pencil size={16} /></button>
                  )}

                  {o.estado === 'PENDIENTE' && <>
                    <Button size="sm" onClick={() => approveMut.mutate(o.id)} loading={approveMut.isPending}><CheckCircle size={13} className="mr-1" />Aprobar</Button>
                    <Button size="sm" variant="danger" onClick={() => { if (confirm('¿Cancelar?')) cancelMut.mutate(o.id); }}>Cancelar</Button>
                  </>}
                  {o.estado === 'APROBADA' && (
                    <Button size="sm" variant="success" onClick={() => receiveMut.mutate(o)} loading={receiveMut.isPending}><Package size={13} className="mr-1" />Recibir en Bodega</Button>
                  )}
                  {o.estado === 'RECIBIDA' && <span className="text-xs text-green-600 font-medium">✓ Recibida {o.fecha_recepcion ? format(new Date(o.fecha_recepcion),'dd/MM/yy') : ''}</span>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ══ Modal crear ══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900">Nueva Orden de Compra</h3>
                <p className="text-xs text-gray-400 mt-0.5">Cliente: {currentClient.nombre_comercial}</p>
              </div>
              <button onClick={closeModal}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Seleccionar proveedor —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.razon_social}</option>)}
                </select>
                {suppliers.length === 0 && <p className="text-xs text-red-500 mt-1">Sin proveedores. Ve a Proveedores y crea uno primero.</p>}
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Truck size={16} className="text-orange-600" />
                  <label className="text-sm font-semibold text-orange-800">Costo de Domicilio / Flete</label>
                </div>
                <Input type="number" min="0" value={valorDomicilio || ''} onChange={e => setValorDomicilio(parseFloat(e.target.value) || 0)} placeholder="$ 0" className="max-w-[160px]" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700">Líneas de pedido</label>
                  <button onClick={() => setLines(p => [...p, { insumo_id:'', cantidad:0, precio_unitario:0 }])} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Agregar línea</button>
                </div>
                <div className="grid grid-cols-[1fr_80px_110px_90px_20px] gap-2 mb-1 px-1 text-xs text-gray-400">
                  <span>Insumo</span><span>Cant.</span><span>Precio unit.</span><span className="text-right">Subtotal</span><span />
                </div>
                <div className="space-y-2">
                  {lines.map((l, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_110px_90px_20px] gap-2 items-center">
                      <select value={l.insumo_id} onChange={e => setLineIng(i, e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Insumo…</option>
                        {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.nombre}</option>)}
                      </select>
                      <Input type="number" min="0" value={l.cantidad||''} onChange={e=>{const nl=[...lines];nl[i].cantidad=parseFloat(e.target.value)||0;setLines(nl);}} placeholder="0" />
                      <Input type="number" min="0" value={l.precio_unitario||''} onChange={e=>{const nl=[...lines];nl[i].precio_unitario=parseFloat(e.target.value)||0;setLines(nl);}} placeholder="$ precio" />
                      <span className="text-sm font-semibold text-gray-700 text-right">{fmt(l.cantidad*l.precio_unitario)}</span>
                      <button onClick={()=>setLines(lines.filter((_,j)=>j!==i))} disabled={lines.length===1} className="text-red-400 hover:text-red-600 disabled:opacity-30"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                <textarea value={notas} onChange={e=>setNotas(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Observaciones…" />
              </div>

              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal productos</span><span className="font-medium">{fmt(subtotalProductos)}</span></div>
                <div className="flex justify-between text-orange-700"><span>+ Domicilio / Flete</span><span className="font-medium">{fmt(valorDomicilio)}</span></div>
                <div className="flex justify-between text-gray-900 font-bold text-base border-t border-gray-200 pt-2"><span>Total a pagar</span><span>{fmt(totalConDomicilio)}</span></div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex gap-3 justify-end">
              <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
              <Button onClick={() => createMut.mutate()} loading={createMut.isPending}>Crear Orden</Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal editar orden ══ */}
      {editOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900">Editar Orden de Compra</h3>
                <p className="text-xs text-gray-400 mt-0.5">Proveedor: {editOrder.proveedor_nombre} · Al guardar, el precio de cada insumo se actualizará en toda la app.</p>
              </div>
              <button onClick={() => setEditOrder(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2"><Truck size={16} className="text-orange-600" /><label className="text-sm font-semibold text-orange-800">Domicilio / Flete</label></div>
                <Input type="number" min="0" value={editDomicilio||''} onChange={e=>setEditDomicilio(parseFloat(e.target.value)||0)} placeholder="$ 0" className="max-w-[160px]" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700">Líneas de pedido</label>
                  <button onClick={() => setEditLines(p => [...p, { insumo_id:'', cantidad:0, precio_unitario:0 }])} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Agregar línea</button>
                </div>
                <div className="grid grid-cols-[1fr_80px_110px_90px_20px] gap-2 mb-1 px-1 text-xs text-gray-400">
                  <span>Insumo</span><span>Cant.</span><span>Precio unit.</span><span className="text-right">Subtotal</span><span />
                </div>
                <div className="space-y-2">
                  {editLines.map((l, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_110px_90px_20px] gap-2 items-center">
                      <select value={l.insumo_id} onChange={e => setEditLineIng(i, e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Insumo…</option>
                        {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.nombre}</option>)}
                      </select>
                      <Input type="number" min="0" value={l.cantidad||''} onChange={e=>{const nl=[...editLines];nl[i].cantidad=parseFloat(e.target.value)||0;setEditLines(nl);}} placeholder="0" />
                      <Input type="number" min="0" value={l.precio_unitario||''} onChange={e=>{const nl=[...editLines];nl[i].precio_unitario=parseFloat(e.target.value)||0;setEditLines(nl);}} placeholder="$ precio" />
                      <span className="text-sm font-semibold text-gray-700 text-right">{fmt(l.cantidad*l.precio_unitario)}</span>
                      <button onClick={()=>setEditLines(editLines.filter((_,j)=>j!==i))} disabled={editLines.length===1} className="text-red-400 hover:text-red-600 disabled:opacity-30"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={editNotas} onChange={e=>setEditNotas(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal productos</span><span className="font-medium">{fmt(editSubtotal)}</span></div>
                <div className="flex justify-between text-orange-700"><span>+ Domicilio</span><span className="font-medium">{fmt(editDomicilio)}</span></div>
                <div className="flex justify-between text-gray-900 font-bold text-base border-t border-gray-200 pt-2"><span>Total</span><span>{fmt(editTotal)}</span></div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                ⚠️ Al guardar, si cambiaste el precio de algún insumo, se actualizará en <strong>Insumos (Maestro)</strong> y en todas las <strong>Fichas Técnicas</strong> que lo usen.
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setEditOrder(null)}>Cancelar</Button>
              <Button onClick={() => editMut.mutate()} loading={editMut.isPending}>Guardar Cambios</Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal ver detalle ══ */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Detalle de Orden</h3>
              <div className="flex items-center gap-2">
                {viewOrder.estado === 'PENDIENTE' && (
                  <button onClick={() => { setViewOrder(null); openEdit(viewOrder); }} className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium px-2 py-1 hover:bg-green-50 rounded">
                    <Pencil size={13} /> Editar
                  </button>
                )}
                <button onClick={()=>setViewOrder(null)}><X size={20} className="text-gray-400" /></button>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div><span className="text-xs text-gray-400">PROVEEDOR</span><p className="font-semibold">{viewOrder.proveedor_nombre}</p></div>
                <div><span className="text-xs text-gray-400">ESTADO</span><p><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[viewOrder.estado]}`}>{STATUS_LABELS[viewOrder.estado]}</span></p></div>
                <div><span className="text-xs text-gray-400">EMISIÓN</span><p className="font-medium">{format(new Date(viewOrder.fecha_emision),'dd/MM/yyyy')}</p></div>
                {viewOrder.fecha_recepcion && <div><span className="text-xs text-gray-400">RECEPCIÓN</span><p className="font-medium">{format(new Date(viewOrder.fecha_recepcion),'dd/MM/yyyy')}</p></div>}
              </div>
              <table className="w-full text-sm mb-4">
                <thead><tr className="border-b border-gray-200"><th className="p-2 text-left text-gray-500">Insumo</th><th className="p-2 text-right text-gray-500">Cant.</th><th className="p-2 text-right text-gray-500">Precio</th><th className="p-2 text-right text-gray-500">Subtotal</th></tr></thead>
                <tbody>
                  {viewOrder.detalles.map(d=>(
                    <tr key={d.id} className="border-b border-gray-100">
                      <td className="p-2">{d.insumo_nombre}</td>
                      <td className="p-2 text-right">{d.cantidad}</td>
                      <td className="p-2 text-right">{fmt(d.precio_unitario)}</td>
                      <td className="p-2 text-right font-medium">{fmt(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 text-sm border-t border-gray-200 pt-3">
                <div className="flex justify-between text-gray-600"><span>Subtotal productos</span><span>{fmt(viewOrder.subtotal_productos)}</span></div>
                {viewOrder.valor_domicilio > 0 && <div className="flex justify-between text-orange-600"><span>+ Domicilio</span><span>{fmt(viewOrder.valor_domicilio)}</span></div>}
                <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2"><span>TOTAL</span><span>{fmt(viewOrder.total)}</span></div>
              </div>
              {viewOrder.notas && <p className="mt-3 text-xs text-gray-500 italic border-t border-gray-100 pt-2">Notas: {viewOrder.notas}</p>}
            </div>
            <div className="p-5 border-t flex justify-end"><Button variant="secondary" onClick={()=>setViewOrder(null)}>Cerrar</Button></div>
          </div>
        </div>
      )}
    </div>
  );
};
