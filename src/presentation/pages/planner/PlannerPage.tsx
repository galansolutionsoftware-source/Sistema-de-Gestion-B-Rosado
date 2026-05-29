import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useClient } from '../../contexts/ClientContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  X, AlertTriangle, ShoppingCart, Plus,
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { SupabaseRecipeSheetRepository } from '../../../infra/repositories/SupabaseRecipeSheetRepository';
import { SupabaseServiceSlotRepository } from '../../../infra/repositories/SupabaseServiceSlotRepository';
import { SupabaseMenuPlanningRepository } from '../../../infra/repositories/SupabaseMenuPlanningRepository';
import { SupabaseInventoryRepository } from '../../../infra/repositories/SupabaseInventoryRepository';
import { ExplodeIngredientsUseCase } from '../../../core/use-cases/planning/ExplodeIngredientsUseCase';
import type { MenuPlanning, CreateMenuPlanningDTO } from '../../../core/entities/MenuPlanning';

const recipeRepo  = new SupabaseRecipeSheetRepository();
const slotRepo    = new SupabaseServiceSlotRepository();
const planningRepo = new SupabaseMenuPlanningRepository();
const inventoryRepo = new SupabaseInventoryRepository();
const explodeUseCase = new ExplodeIngredientsUseCase(planningRepo, inventoryRepo);

const SERVICE_SLOTS = ['DESAYUNO', 'REFRIGERIO_AM', 'ALMUERZO', 'REFRIGERIO_PM', 'CENA'] as const;

const SLOT_LABELS: Record<string, string> = {
  DESAYUNO:      'Desayuno',
  REFRIGERIO_AM: 'Refrigerio AM',
  ALMUERZO:      'Almuerzo',
  REFRIGERIO_PM: 'Refrigerio PM',
  CENA:          'Cena',
};

const SLOT_COLORS: Record<string, string> = {
  DESAYUNO:      'bg-yellow-50  border-yellow-200 text-yellow-900',
  REFRIGERIO_AM: 'bg-orange-50  border-orange-200 text-orange-900',
  ALMUERZO:      'bg-blue-50    border-blue-200   text-blue-900',
  REFRIGERIO_PM: 'bg-purple-50  border-purple-200 text-purple-900',
  CENA:          'bg-indigo-50  border-indigo-200 text-indigo-900',
};

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Formatea fecha local sin desfase de zona horaria
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const PlannerPage: React.FC = () => {
  const { currentClient } = useClient();
  const qc = useQueryClient();

  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const weekEnd = addDays(weekStart, 6);

  const [addModal, setAddModal] = useState<{ dayStr: string; slot: string } | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [numRaciones, setNumRaciones] = useState(100);

  const clientId = currentClient?.id ?? '';

  const { data: plannings = [], isLoading: planLoading } = useQuery({
    queryKey: ['plannings', clientId, toLocalDateStr(weekStart), toLocalDateStr(weekEnd)],
    queryFn: () => planningRepo.findByDateRange(clientId, weekStart, weekEnd),
    enabled: !!clientId,
  });

  const { data: ingredientExplosion, isLoading: explLoading } = useQuery({
    queryKey: ['ingredientExplosion', clientId, toLocalDateStr(weekStart), toLocalDateStr(weekEnd)],
    queryFn: () => explodeUseCase.execute(clientId, weekStart, weekEnd),
    enabled: !!clientId,
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes', clientId],
    queryFn:  () => recipeRepo.findAll(clientId),
    enabled:  !!clientId,
  });

  const { data: slots = [] } = useQuery({
    queryKey: ['service-slots'],
    queryFn:  () => slotRepo.findAll(),
  });

  const createMut = useMutation({
    mutationFn: (d: CreateMenuPlanningDTO) => planningRepo.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plannings'] });
      qc.invalidateQueries({ queryKey: ['ingredientExplosion'] });
      toast.success('Menú asignado');
      setAddModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => planningRepo.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plannings'] });
      qc.invalidateQueries({ queryKey: ['ingredientExplosion'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Permite múltiples platos por franja/día
  const getEntries = (dayStr: string, slotName: string): MenuPlanning[] =>
    plannings.filter(
      p => p.fecha === dayStr && p.franja_nombre === slotName,
    );

  const openAdd = (dayStr: string, slotName: string) => {
    const slot = slots.find(s => s.nombre === slotName);
    if (!slot) { toast.error('Franja no encontrada'); return; }
    setSelectedSlotId(slot.id);
    setSelectedRecipe('');
    setNumRaciones(100);
    setAddModal({ dayStr, slot: slotName });
  };

  const handleAdd = async () => {
    if (!currentClient || !addModal) return;
    if (!selectedRecipe) { toast.error('Selecciona un plato'); return; }
    if (!selectedSlotId) { toast.error('Franja no válida'); return; }
    if (numRaciones < 1) { toast.error('Las raciones deben ser mayor a 0'); return; }

    // Crear la fecha usando los componentes locales para evitar desfase UTC
    const [year, month, day] = addModal.dayStr.split('-').map(Number);
    const fecha = new Date(year, month - 1, day, 12, 0, 0);

    createMut.mutate({
      cliente_id:   currentClient.id,
      fecha,
      franja_id:    selectedSlotId,
      ficha_id:     selectedRecipe,
      num_raciones: numRaciones,
    });
  };

  const isLoading = planLoading || explLoading;

  if (!currentClient) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Planificador de Menús</h2>
        <Card>
          <div className="text-center py-16">
            <CalendarIcon size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">Selecciona un cliente en la barra superior para planificar menús.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Cabecera */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Planificador de Menús</h2>
          <p className="text-gray-500 text-sm mt-1">{currentClient.nombre_comercial}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(w => subDays(w, 7))} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium">
            <CalendarIcon size={15} className="text-gray-500" />
            {format(weekStart, "d 'de' MMM", { locale: es })} – {format(weekEnd, "d 'de' MMM, yyyy", { locale: es })}
          </div>
          <button onClick={() => setWeekStart(w => addDays(w, 7))} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Hoy
          </Button>
        </div>
      </div>

      {!isLoading && recipes.length === 0 && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            No hay fichas técnicas para este cliente. Ve a <strong>Insumos → Fichas Técnicas</strong> y crea los platos primero.
          </p>
        </div>
      )}

      {/* Grilla semanal */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50 w-32 border border-gray-200">Franja</th>
                  {weekDays.map((day, i) => {
                    const dayStr  = toLocalDateStr(day);
                    const todayStr = toLocalDateStr(new Date());
                    const isToday = dayStr === todayStr;
                    return (
                      <th key={dayStr} className={`p-3 text-center text-sm bg-gray-50 border border-gray-200 ${isToday ? 'bg-blue-50' : ''}`}>
                        <div className={`font-semibold ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>{DAY_LABELS[i]}</div>
                        <div className={`text-xs ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>{format(day, 'd/MM')}</div>
                        {isToday && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mx-auto mt-1" />}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {SERVICE_SLOTS.map(slot => (
                  <tr key={slot}>
                    <td className="p-3 border border-gray-200 bg-gray-50">
                      <span className="text-xs font-semibold text-gray-700">{SLOT_LABELS[slot]}</span>
                    </td>
                    {weekDays.map(day => {
                      const dayStr = toLocalDateStr(day);
                      const entries = getEntries(dayStr, slot);

                      return (
                        <td key={dayStr} className="p-1.5 border border-gray-100 align-top">
                          <div className="min-h-[68px] space-y-1">
                            {entries.map(entry => (
                              <div key={entry.id} className={`relative group p-2 rounded-lg border text-xs ${SLOT_COLORS[slot]}`}>
                                <p className="font-semibold pr-4 leading-tight">{entry.ficha_nombre}</p>
                                <p className="mt-0.5 opacity-70">{entry.num_raciones} raciones</p>
                                <button
                                  onClick={() => { if (confirm('¿Quitar este menú?')) deleteMut.mutate(entry.id); }}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-red-600"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ))}
                            {/* Botón agregar siempre visible para múltiples platos */}
                            <button
                              onClick={() => openAdd(dayStr, slot)}
                              disabled={recipes.length === 0}
                              className="w-full border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-300 hover:border-blue-400 hover:text-blue-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-1 py-1"
                            >
                              <Plus size={10} /> {entries.length === 0 ? 'Asignar' : 'Agregar'}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Necesidades de insumos */}
      {ingredientExplosion && ingredientExplosion.length > 0 && (
        <div className="mt-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Necesidades de Insumos de la Semana</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Total de ingredientes requeridos según las raciones planificadas
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ShoppingCart size={14} />
                <span>{ingredientExplosion.filter(i => (i.necesidad_compra ?? 0) > 0).length} insumo(s) por comprar</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Insumo', 'Necesidad Total', 'Unidad', 'Stock Disponible', 'Por Comprar'].map(h => (
                      <th key={h} className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ingredientExplosion.map((item, idx) => {
                    const needsBuy = (item.necesidad_compra ?? 0) > 0;
                    return (
                      <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 ${needsBuy ? 'bg-orange-50' : ''}`}>
                        <td className="p-3 text-sm font-medium text-gray-900">{item.insumo_nombre}</td>
                        <td className="p-3 text-sm font-bold text-gray-800">
                          {Number(item.cantidad_total).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-sm text-gray-500">{item.unidad_medida}</td>
                        <td className="p-3 text-sm text-gray-600">
                          {Number(item.stock_disponible ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          {needsBuy ? (
                            <span className="text-sm font-bold text-orange-600">
                              {Number(item.necesidad_compra).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-sm text-green-600 font-medium">✓ Suficiente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {ingredientExplosion.some(i => (i.necesidad_compra ?? 0) > 0) && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Sugerencia:</strong> Ve a <strong>Compras</strong> y crea una orden para los insumos marcados en naranja.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal asignar menú */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900">Asignar Menú</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {SLOT_LABELS[addModal.slot]} · {format(parseISO(addModal.dayStr), "EEEE d 'de' MMMM", { locale: es })}
                </p>
              </div>
              <button onClick={() => setAddModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plato (Ficha Técnica) *</label>
                <select
                  value={selectedRecipe}
                  onChange={e => setSelectedRecipe(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Seleccionar plato —</option>
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.nombre_plato}{r.costo_total_por_racion > 0 ? ` — $${Number(r.costo_total_por_racion).toLocaleString('es-CO')}/rac` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Raciones *</label>
                <Input type="number" min="1" value={numRaciones} onChange={e => setNumRaciones(parseInt(e.target.value) || 1)} placeholder="Ej. 150" />
              </div>
              {selectedRecipe && numRaciones > 0 && (() => {
                const recipe = recipes.find(r => r.id === selectedRecipe);
                if (!recipe || !recipe.costo_total_por_racion) return null;
                const costoTotal = recipe.costo_total_por_racion * numRaciones;
                return (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm flex justify-between">
                    <span className="text-blue-700">Costo estimado total:</span>
                    <span className="font-bold text-blue-900">${costoTotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
                  </div>
                );
              })()}
            </div>
            <div className="p-5 border-t border-gray-200 flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setAddModal(null)}>Cancelar</Button>
              <Button onClick={handleAdd} loading={createMut.isPending}>Asignar Menú</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
