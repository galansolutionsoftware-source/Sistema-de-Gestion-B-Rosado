import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, FlaskConical, BookOpen, X, Search, Printer, Edit2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useClient } from '../../contexts/ClientContext';
import { SupabaseIngredientRepository } from '../../../infra/repositories/SupabaseIngredientRepository';
import { SupabaseRecipeSheetRepository } from '../../../infra/repositories/SupabaseRecipeSheetRepository';
import { supabase } from '../../../infra/supabase/client';
import type { Ingredient, CreateIngredientDTO, MeasureUnit } from '../../../core/entities/Ingredient';
import type { RecipeSheet, CreateRecipeSheetDTO } from '../../../core/entities/RecipeSheet';

const ingRepo    = new SupabaseIngredientRepository();
const recipeRepo = new SupabaseRecipeSheetRepository();

const CAT_LABELS: Record<string, string> = {
  MATERIAS_PRIMAS: 'Materias Primas',
  PRODUCTOS_ASEO:  'Productos de Aseo',
  DESECHABLES:     'Desechables',
  CONDIMENTOS:     'Condimentos',
};
const CAT_COLORS: Record<string, string> = {
  MATERIAS_PRIMAS: 'bg-green-100  text-green-700',
  PRODUCTOS_ASEO:  'bg-blue-100   text-blue-700',
  DESECHABLES:     'bg-purple-100 text-purple-700',
  CONDIMENTOS:     'bg-yellow-100 text-yellow-700',
};
const UNIT_LABELS: Record<string, string> = {
  GRAMOS:      'g',
  KILOGRAMOS:  'kg',
  LITROS:      'L',
  UNIDADES:    'und',
  MILILITROS:  'ml',
  LIBRAS:      'lb',
};

// Label for price field per unit type
const PRICE_LABEL: Record<string, string> = {
  GRAMOS:     'Precio por kilogramo ($)',
  KILOGRAMOS: 'Precio por kilogramo ($)',
  LITROS:     'Precio por litro ($)',
  MILILITROS: 'Precio por litro ($)',
  UNIDADES:   'Precio por unidad ($)',
  LIBRAS:     'Precio por libra ($)',
};

/* ══════════════════════════════════════════════
   TAB 1 — INSUMOS (maestro por cliente)
══════════════════════════════════════════════ */
const IngredientsTab: React.FC = () => {
  const qc = useQueryClient();
  const { currentClient } = useClient();
  const [showModal, setShowModal]   = useState(false);
  const [editing,   setEditing]     = useState<Ingredient | null>(null);
  const [search,    setSearch]      = useState('');
  const [catFilter, setCatFilter]   = useState('ALL');

  // Form state
  const [form, setForm] = useState<CreateIngredientDTO>({
    codigo: '', nombre: '', categoria_id: '', unidad_medida: 'KILOGRAMOS', precio_base: 0,
  });
  // Calculator fields
  const [cantidadComprada, setCantidadComprada] = useState<string>('');
  const [totalPagado, setTotalPagado]           = useState<string>('');
  const [calcMode, setCalcMode]                 = useState<'qty_to_total' | 'total_to_qty'>('qty_to_total');

  const { data: categories = [] } = useQuery({
    queryKey: ['ingredient-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categorias_insumos').select('*').order('nombre');
      return data ?? [];
    },
  });

  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ['ingredients', currentClient?.id],
    queryFn: () => ingRepo.findAll(currentClient?.id),
    enabled: !!currentClient,
  });

  const createMut = useMutation({
    mutationFn: (d: CreateIngredientDTO) => ingRepo.create({ ...d, cliente_id: currentClient?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Insumo creado'); closeModal(); },
    onError:   (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<CreateIngredientDTO> }) => ingRepo.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredients'] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Insumo actualizado — fichas técnicas actualizadas');
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => ingRepo.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Insumo eliminado'); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ codigo: '', nombre: '', categoria_id: categories[0]?.id ?? '', unidad_medida: 'KILOGRAMOS', precio_base: 0 });
    setCantidadComprada('');
    setTotalPagado('');
    setCalcMode('qty_to_total');
    setShowModal(true);
  };
  const openEdit = (ing: Ingredient) => {
    setEditing(ing);
    setForm({ codigo: ing.codigo, nombre: ing.nombre, categoria_id: ing.categoria_id, unidad_medida: ing.unidad_medida, precio_base: ing.precio_base });
    setCantidadComprada('');
    setTotalPagado('');
    setCalcMode('qty_to_total');
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  // Calculator logic: qty * precio = total  OR  total / precio = qty
  const calcResult = (() => {
    const precio = form.precio_base ?? 0;
    const qty    = parseFloat(cantidadComprada) || 0;
    const total  = parseFloat(totalPagado) || 0;

    if (calcMode === 'qty_to_total' && qty > 0 && precio > 0) {
      return { label: 'Total estimado', value: qty * precio };
    }
    if (calcMode === 'total_to_qty' && total > 0 && precio > 0) {
      return { label: `Cantidad (${UNIT_LABELS[form.unidad_medida] ?? form.unidad_medida}) por ese precio`, value: total / precio };
    }
    return null;
  })();

  const handleSubmit = () => {
    if (!form.nombre || !form.codigo || !form.categoria_id) {
      toast.error('Código, nombre y categoría son obligatorios');
      return;
    }
    if (editing) updateMut.mutate({ id: editing.id, d: form });
    else         createMut.mutate(form);
  };

  const filtered = ingredients.filter(i => {
    const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase()) ||
                        i.codigo.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === 'ALL' || i.categoria_id === catFilter;
    return matchSearch && matchCat;
  });

  if (!currentClient) {
    return (
      <div className="text-center py-12">
        <FlaskConical size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-400">Selecciona un cliente para ver sus insumos.</p>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="text-gray-400 shrink-0" />
          <Input placeholder="Buscar por nombre o código…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Todas las categorías</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{CAT_LABELS[c.nombre] ?? c.nombre}</option>
          ))}
        </select>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-1" /> Nuevo Insumo
        </Button>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FlaskConical size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">
            {ingredients.length === 0 ? 'No hay insumos registrados para este cliente.' : 'Ningún insumo coincide.'}
          </p>
          {ingredients.length === 0 && (
            <Button className="mt-3" onClick={openCreate}>Crear primer insumo</Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Código', 'Nombre', 'Categoría', 'Medida', 'Precio Base', ''].map(h => (
                  <th key={h} className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(ing => (
                <tr key={ing.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 text-sm font-mono text-gray-600">{ing.codigo}</td>
                  <td className="p-3 text-sm font-medium text-gray-900">{ing.nombre}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[ing.categoria_nombre as string] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CAT_LABELS[ing.categoria_nombre as string] ?? ing.categoria_nombre}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-600">{UNIT_LABELS[ing.unidad_medida] ?? ing.unidad_medida}</td>
                  <td className="p-3 text-sm font-semibold text-gray-800">
                    ${Number(ing.precio_base).toLocaleString('es-CO')} / {UNIT_LABELS[ing.unidad_medida] ?? ing.unidad_medida}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(ing)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Pencil size={14} /></button>
                      <button
                        onClick={() => { if (confirm(`¿Eliminar "${ing.nombre}"?`)) deleteMut.mutate(ing.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">{editing ? 'Editar Insumo' : 'Nuevo Insumo'}</h3>
              <button onClick={closeModal}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                  <Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="INS-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Pollo entero" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                <select
                  value={form.categoria_id}
                  onChange={e => setForm({ ...form, categoria_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Seleccionar —</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{CAT_LABELS[c.nombre] ?? c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Unidad de medida */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
                <select
                  value={form.unidad_medida}
                  onChange={e => setForm({ ...form, unidad_medida: e.target.value as MeasureUnit })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="KILOGRAMOS">Kilogramos (kg)</option>
                  <option value="GRAMOS">Gramos (g)</option>
                  <option value="LITROS">Litros (L)</option>
                  <option value="MILILITROS">Mililitros (ml)</option>
                  <option value="UNIDADES">Unidades (und)</option>
                  <option value="LIBRAS">Libras (lb)</option>
                </select>
              </div>

              {/* Precio base */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {PRICE_LABEL[form.unidad_medida] ?? 'Precio base ($)'}
                </label>
                <Input
                  type="number" min="0"
                  value={form.precio_base ?? 0}
                  onChange={e => setForm({ ...form, precio_base: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              {/* Calculadora de compra */}
              <div className="border border-blue-100 bg-blue-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-blue-800">🧮 Calculadora de Compra</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCalcMode('qty_to_total')}
                      className={`text-xs px-2 py-1 rounded font-medium transition-colors ${calcMode === 'qty_to_total' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-300'}`}
                    >
                      Qty → Total
                    </button>
                    <button
                      onClick={() => setCalcMode('total_to_qty')}
                      className={`text-xs px-2 py-1 rounded font-medium transition-colors ${calcMode === 'total_to_qty' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-300'}`}
                    >
                      Total → Qty
                    </button>
                  </div>
                </div>

                {calcMode === 'qty_to_total' ? (
                  <div>
                    <label className="block text-xs text-blue-700 mb-1">
                      Cantidad comprada ({UNIT_LABELS[form.unidad_medida] ?? form.unidad_medida})
                    </label>
                    <Input
                      type="number" min="0"
                      value={cantidadComprada}
                      onChange={e => setCantidadComprada(e.target.value)}
                      placeholder={`Ej: 5 (serían 5 ${UNIT_LABELS[form.unidad_medida] ?? form.unidad_medida})`}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-blue-700 mb-1">Total pagado ($)</label>
                    <Input
                      type="number" min="0"
                      value={totalPagado}
                      onChange={e => setTotalPagado(e.target.value)}
                      placeholder="Ej: 50000"
                    />
                  </div>
                )}

                {calcResult && (
                  <div className="bg-white border border-blue-200 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-sm text-blue-700">{calcResult.label}:</span>
                    <span className="text-base font-bold text-blue-900">
                      {calcMode === 'qty_to_total'
                        ? `$${calcResult.value.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`
                        : `${calcResult.value.toLocaleString('es-CO', { maximumFractionDigits: 3 })} ${UNIT_LABELS[form.unidad_medida] ?? form.unidad_medida}`}
                    </span>
                  </div>
                )}

                <p className="text-xs text-blue-600 italic">
                  {calcMode === 'qty_to_total'
                    ? `Precio unitario × cantidad = total a pagar`
                    : `Total pagado ÷ precio unitario = cantidad obtenida`}
                </p>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex gap-3 justify-end">
              <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
              <Button onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending}>
                {editing ? 'Guardar Cambios' : 'Crear Insumo'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ══════════════════════════════════════════════
   TAB 2 — FICHAS TÉCNICAS (por cliente)
══════════════════════════════════════════════ */
const RecipeSheetsTab: React.FC = () => {
  const { currentClient } = useClient();
  const qc = useQueryClient();
  const [showModal, setShowModal]     = useState(false);
  const [editing, setEditing]         = useState<RecipeSheet | null>(null);
  const [viewing, setViewing]         = useState<RecipeSheet | null>(null);
  const [recipeName, setRecipeName]   = useState('');
  const [recipeDesc, setRecipeDesc]   = useState('');
  const [details, setDetails]         = useState<{ insumo_id: string; gramaje_neto_por_racion: number }[]>([
    { insumo_id: '', gramaje_neto_por_racion: 0 },
  ]);

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients', currentClient?.id],
    queryFn: () => ingRepo.findAll(currentClient?.id),
    enabled: !!currentClient,
  });

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes', currentClient?.id],
    queryFn:  () => recipeRepo.findAll(currentClient!.id),
    enabled:  !!currentClient,
  });

  const createMut = useMutation({
    mutationFn: (d: CreateRecipeSheetDTO) => recipeRepo.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Ficha técnica creada');
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<CreateRecipeSheetDTO> }) => recipeRepo.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Ficha técnica actualizada');
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => recipeRepo.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Ficha eliminada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setViewing(null);
    setRecipeName('');
    setRecipeDesc('');
    setDetails([{ insumo_id: '', gramaje_neto_por_racion: 0 }]);
    setShowModal(true);
  };

  const openEdit = (r: RecipeSheet) => {
    setEditing(r);
    setViewing(null);
    setRecipeName(r.nombre_plato);
    setRecipeDesc(r.descripcion ?? '');
    setDetails(r.detalles.map(d => ({ insumo_id: d.insumo_id, gramaje_neto_por_racion: d.gramaje_neto_por_racion })));
    setShowModal(true);
  };

  const openView = (r: RecipeSheet) => {
    setViewing(r);
    setEditing(null);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setViewing(null); setEditing(null); };

  const handleSave = () => {
    if (!currentClient) { toast.error('Selecciona un cliente primero'); return; }
    if (!recipeName.trim()) { toast.error('El nombre del plato es obligatorio'); return; }
    const valid = details.filter(d => d.insumo_id && d.gramaje_neto_por_racion > 0);
    if (valid.length === 0) { toast.error('Agrega al menos un ingrediente con gramaje'); return; }

    if (editing) {
      updateMut.mutate({ id: editing.id, d: { nombre_plato: recipeName, descripcion: recipeDesc, detalles: valid } });
    } else {
      createMut.mutate({ cliente_id: currentClient.id, nombre_plato: recipeName, descripcion: recipeDesc, detalles: valid });
    }
  };

  const handlePrint = (recipes: RecipeSheet[]) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const html = `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Menú — ${currentClient?.nombre_comercial}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #222; }
        h1 { text-align: center; font-size: 28px; margin-bottom: 4px; }
        .subtitle { text-align: center; color: #666; margin-bottom: 30px; font-size: 14px; }
        .plato { margin-bottom: 24px; border-top: 2px solid #eee; padding-top: 18px; }
        .plato-nombre { font-size: 20px; font-weight: bold; margin-bottom: 6px; }
        .plato-desc { color: #666; font-size: 13px; margin-bottom: 10px; }
        .ingredientes { font-size: 14px; color: #444; }
        .ingredientes li { margin-bottom: 2px; }
        @media print { body { padding: 10px; } }
      </style></head><body>
      <h1>🍽️ ${currentClient?.nombre_comercial}</h1>
      <div class="subtitle">Menú del día</div>
      ${recipes.map(r => `
        <div class="plato">
          <div class="plato-nombre">${r.nombre_plato}</div>
          ${r.descripcion ? `<div class="plato-desc">${r.descripcion}</div>` : ''}
          <div class="ingredientes">
            <strong>Ingredientes:</strong>
            <ul>${r.detalles.map(d => `<li>${d.insumo_nombre ?? '—'}</li>`).join('')}</ul>
          </div>
        </div>
      `).join('')}
      <script>window.onload = () => window.print();</script>
      </body></html>
    `;
    win.document.write(html);
    win.document.close();
  };

  if (!currentClient) {
    return (
      <div className="text-center py-12">
        <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-400">Selecciona un cliente en la barra superior para ver sus fichas técnicas.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-5">
        <p className="text-sm text-gray-500">
          Fichas de <strong>{currentClient.nombre_comercial}</strong> — {recipes.length} registrada{recipes.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          {recipes.length > 0 && (
            <Button variant="secondary" onClick={() => handlePrint(recipes)}>
              <Printer size={15} className="mr-1" /> Imprimir Menú Completo
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1" /> Nueva Ficha
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">No hay fichas técnicas para este cliente.</p>
          <p className="text-gray-400 text-sm mt-1">Crea la primera para poder planificar menús.</p>
          <Button className="mt-4" onClick={openCreate}>Crear primera ficha</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map(r => (
            <div key={r.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900 flex-1 pr-2">{r.nombre_plato}</h3>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openView(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Ver ingredientes"><BookOpen size={14} /></button>
                  <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Editar ficha"><Edit2 size={14} /></button>
                  <button onClick={() => handlePrint([r])} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Imprimir este menú"><Printer size={14} /></button>
                  <button onClick={() => { if (confirm(`¿Eliminar "${r.nombre_plato}"?`)) deleteMut.mutate(r.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                </div>
              </div>
              {r.descripcion && <p className="text-xs text-gray-400 mb-3">{r.descripcion}</p>}
              <div className="space-y-1 mb-3">
                {r.detalles.slice(0, 4).map(d => (
                  <div key={d.id} className="flex justify-between text-xs text-gray-500">
                    <span>{d.insumo_nombre ?? '—'}</span>
                    <span className="font-medium">{d.gramaje_neto_por_racion} g/ración</span>
                  </div>
                ))}
                {r.detalles.length > 4 && (
                  <p className="text-xs text-gray-400 italic">+{r.detalles.length - 4} ingrediente{r.detalles.length - 4 !== 1 ? 's' : ''} más…</p>
                )}
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-400">{r.detalles.length} ingrediente{r.detalles.length !== 1 ? 's' : ''}</span>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Costo / ración</p>
                  <p className="text-sm font-bold text-green-700">
                    ${Number(r.costo_total_por_racion).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal ver / crear / editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">
                {viewing ? `Ficha: ${viewing.nombre_plato}` : editing ? 'Editar Ficha Técnica' : 'Nueva Ficha Técnica'}
              </h3>
              <button onClick={closeModal}><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {viewing ? (
                <>
                  {viewing.descripcion && <p className="text-sm text-gray-500 italic">{viewing.descripcion}</p>}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="p-2 text-left text-gray-500">Ingrediente</th>
                        <th className="p-2 text-right text-gray-500">Gramaje / ración</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewing.detalles.map(d => (
                        <tr key={d.id} className="border-b border-gray-100">
                          <td className="p-2">{d.insumo_nombre ?? '—'}</td>
                          <td className="p-2 text-right font-medium">{d.gramaje_neto_por_racion} g</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end pt-2">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Costo total por ración</p>
                      <p className="text-xl font-bold text-green-700">
                        ${Number(viewing.costo_total_por_racion).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Plato *</label>
                      <Input value={recipeName} onChange={e => setRecipeName(e.target.value)} placeholder="Arroz con pollo" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <Input value={recipeDesc} onChange={e => setRecipeDesc(e.target.value)} placeholder="Opcional" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold text-gray-700">Ingredientes y gramaje neto por ración</label>
                      <button onClick={() => setDetails(p => [...p, { insumo_id: '', gramaje_neto_por_racion: 0 }])} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Agregar ingrediente</button>
                    </div>
                    <div className="space-y-2">
                      {details.map((d, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <select
                            value={d.insumo_id}
                            onChange={e => { const nd = [...details]; nd[i].insumo_id = e.target.value; setDetails(nd); }}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">— Seleccionar insumo —</option>
                            {ingredients.map(ing => (
                              <option key={ing.id} value={ing.id}>
                                {ing.nombre} ({UNIT_LABELS[ing.unidad_medida] ?? ing.unidad_medida})
                              </option>
                            ))}
                          </select>
                          <div className="w-36">
                            <Input
                              type="number" min="0"
                              value={d.gramaje_neto_por_racion || ''}
                              onChange={e => { const nd = [...details]; nd[i].gramaje_neto_por_racion = parseFloat(e.target.value) || 0; setDetails(nd); }}
                              placeholder="Gramaje"
                            />
                          </div>
                          <button onClick={() => setDetails(details.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:text-red-600" disabled={details.length === 1}><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 flex gap-3 justify-end">
              {viewing ? (
                <>
                  <Button variant="secondary" onClick={() => { openEdit(viewing); }}>
                    <Edit2 size={14} className="mr-1" /> Editar
                  </Button>
                  <Button variant="secondary" onClick={closeModal}>Cerrar</Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
                  <Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending}>
                    {editing ? 'Guardar Cambios' : 'Crear Ficha'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ══════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════ */
export const IngredientsPage: React.FC = () => {
  const [tab, setTab] = useState<'ingredients' | 'recipes'>('ingredients');

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Maestro de Insumos</h2>
        <p className="text-gray-500 text-sm mt-1">
          Gestiona insumos y fichas técnicas de platos por cliente
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {([
            ['ingredients', <FlaskConical size={16} />, 'Insumos (Maestro)'],
            ['recipes',     <BookOpen    size={16} />, 'Fichas Técnicas de Platos'],
          ] as const).map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </nav>
      </div>

      <Card>
        {tab === 'ingredients' ? <IngredientsTab /> : <RecipeSheetsTab />}
      </Card>
    </div>
  );
};
