import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileSpreadsheet, LayoutGrid, DollarSign, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useClient } from '../../contexts/ClientContext';
import { SupabaseMenuPlanningRepository } from '../../../infra/repositories/SupabaseMenuPlanningRepository';
import { SupabasePurchaseOrderRepository } from '../../../infra/repositories/SupabasePurchaseOrderRepository';
import { SupabaseAccountPayableRepository } from '../../../infra/repositories/SupabaseAccountPayableRepository';
import { ScheduleWeeklyPaymentsUseCase } from '../../../core/use-cases/treasury/ScheduleWeeklyPaymentsUseCase';

const planningRepo  = new SupabaseMenuPlanningRepository();
const orderRepo     = new SupabasePurchaseOrderRepository();
const accountRepo   = new SupabaseAccountPayableRepository();
const scheduleUC    = new ScheduleWeeklyPaymentsUseCase(accountRepo);

const SLOT_LABELS: Record<string, string> = {
  DESAYUNO: 'Desayuno', REFRIGERIO_AM: 'Refrigerio AM',
  ALMUERZO: 'Almuerzo', REFRIGERIO_PM: 'Refrigerio PM', CENA: 'Cena',
};
const SERVICE_SLOTS = ['DESAYUNO', 'REFRIGERIO_AM', 'ALMUERZO', 'REFRIGERIO_PM', 'CENA'];

const BOM = '\ufeff';
const FIRMA = 'Elaborado por: Beronica Rosado';
const NOTA  = 'Formatos ejecutivos y profesionales regulados bajo control de autoría corporativa.';

function toCSV(rows: string[][]): string {
  return BOM + rows
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
function downloadCSV(filename: string, rows: string[][]): void {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════
   REPORTE 1 — CARTELERA DE MENÚS
══════════════════════════════════════════════ */
const MenuBoardReport: React.FC = () => {
  const { currentClient } = useClient();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd   = addDays(weekStart, 6);
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: plannings = [], isLoading } = useQuery({
    queryKey: ['plannings-report', currentClient?.id, weekStart.toISOString()],
    queryFn:  () => planningRepo.findByDateRange(currentClient!.id, weekStart, weekEnd),
    enabled:  !!currentClient,
  });

  const getEntry = (day: Date, slot: string) =>
    plannings.find(
      p => format(new Date(p.fecha), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') &&
           p.franja_nombre === slot,
    );

  const handleExport = () => {
    const header = [
      `CARTELERA DE MENÚS — ${currentClient?.nombre_comercial ?? ''}`,
      `Semana: ${format(weekStart, 'dd/MM/yyyy')} al ${format(weekEnd, 'dd/MM/yyyy')}`,
    ];
    const tableHeader = ['Franja', ...weekDays.map(d => format(d, 'EEEE d/MM', { locale: es }))];
    const rows = SERVICE_SLOTS.map(slot => [
      SLOT_LABELS[slot],
      ...weekDays.map(day => {
        const e = getEntry(day, slot);
        return e ? `${e.ficha_nombre} (${e.num_raciones} raciones)` : '—';
      }),
    ]);
    downloadCSV(
      `cartelera_menus_${currentClient?.nombre_comercial ?? 'cliente'}`,
      [...header.map(h => [h]), [''], tableHeader, ...rows, [''], [FIRMA], [NOTA]],
    );
  };

  if (!currentClient) {
    return <p className="text-center text-gray-400 py-10">Selecciona un cliente para ver la cartelera.</p>;
  }

  return (
    <div>
      {/* Controles semana */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(w => addDays(w, -7))}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-medium px-3 py-2 bg-gray-100 rounded-lg">
            {format(weekStart, "d 'de' MMM", { locale: es })} – {format(weekEnd, "d 'de' MMM yyyy", { locale: es })}
          </span>
          <button
            onClick={() => setWeekStart(w => addDays(w, 7))}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <Button size="sm" onClick={handleExport} disabled={plannings.length === 0}>
          <FileSpreadsheet size={15} className="mr-1" /> Exportar a Excel
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm min-w-[700px]">
              <thead>
                <tr>
                  <th className="p-3 text-left bg-gray-800 text-white text-xs font-semibold w-32 border border-gray-700">
                    FRANJA
                  </th>
                  {weekDays.map(d => (
                    <th
                      key={d.toISOString()}
                      className="p-3 text-center bg-gray-800 text-white text-xs font-semibold border border-gray-700"
                    >
                      <div className="capitalize font-bold">
                        {format(d, 'EEEE', { locale: es })}
                      </div>
                      <div className="text-gray-300 font-normal">{format(d, 'd/MM')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SERVICE_SLOTS.map((slot, si) => (
                  <tr key={slot} className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 font-semibold text-gray-700 border border-gray-200 bg-gray-100 text-xs uppercase">
                      {SLOT_LABELS[slot]}
                    </td>
                    {weekDays.map(day => {
                      const e = getEntry(day, slot);
                      return (
                        <td key={day.toISOString()} className="p-2 border border-gray-200 align-top min-w-[110px]">
                          {e ? (
                            <div className="bg-blue-600 text-white rounded-lg p-2 text-xs">
                              <p className="font-semibold leading-tight">{e.ficha_nombre}</p>
                              <p className="mt-0.5 opacity-80">{e.num_raciones} raciones</p>
                            </div>
                          ) : (
                            <span className="text-gray-200 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 italic">{NOTA} {FIRMA}</p>
        </>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════
   REPORTE 2 — RESUMEN DE PAGOS SEMANALES
══════════════════════════════════════════════ */
const PaymentsReport: React.FC = () => {
  const { currentClient } = useClient();

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule-report', currentClient?.id],
    queryFn:  () => scheduleUC.execute(currentClient!.id),
    enabled:  !!currentClient,
  });

  const handleExport = () => {
    if (!schedule) return;
    const header = [
      [`RESUMEN DE PAGOS SEMANALES — ${currentClient?.nombre_comercial ?? ''}`],
      [`Semana: ${format(schedule.weekStart, 'dd/MM/yyyy')} al ${format(schedule.weekEnd, 'dd/MM/yyyy')}`],
      [],
      ['Proveedor', 'NIT', 'Banco', 'Tipo Cuenta', 'Nro. Cuenta', 'Semana Actual ($)', 'Saldos Anteriores ($)', 'Gran Total ($)'],
    ];
    const rows = schedule.supplierSummaries.map(s => [
      s.proveedor_nombre, s.nit, s.banco, s.tipo_cuenta, s.numero_cuenta,
      s.valor_semana_actual.toString(),
      s.valor_semanas_anteriores.toString(),
      s.gran_total.toString(),
    ]);
    const totals = [
      '', '', '', '', 'TOTALES',
      schedule.totalCurrentWeek.toString(),
      schedule.totalOverdueBalances.toString(),
      schedule.grandTotal.toString(),
    ];
    downloadCSV(
      `pagos_semanales_${currentClient?.nombre_comercial ?? 'cliente'}`,
      [...header, ...rows, [], totals, [], [FIRMA], [NOTA]],
    );
  };

  if (!currentClient) {
    return <p className="text-center text-gray-400 py-10">Selecciona un cliente.</p>;
  }

  const noData = !schedule || schedule.supplierSummaries.length === 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <p className="text-sm text-gray-500">
          {schedule
            ? `Semana: ${format(schedule.weekStart, 'dd/MM/yyyy')} – ${format(schedule.weekEnd, 'dd/MM/yyyy')}`
            : 'Calculando…'}
        </p>
        <Button size="sm" onClick={handleExport} disabled={noData}>
          <FileSpreadsheet size={15} className="mr-1" /> Exportar a Excel
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : noData ? (
        <p className="text-center text-gray-400 py-10">No hay obligaciones de pago esta semana.</p>
      ) : (
        <>
          {/* Totales */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              ['Semana Actual', schedule!.totalCurrentWeek,       'text-blue-700',  'bg-blue-50'],
              ['Saldos Vencidos', schedule!.totalOverdueBalances, 'text-red-600',   'bg-red-50'],
              ['Gran Total', schedule!.grandTotal,                'text-gray-900',  'bg-gray-100'],
            ].map(([lbl, val, cls, bg]) => (
              <div key={lbl as string} className={`rounded-xl p-4 text-center ${bg as string}`}>
                <p className="text-xs text-gray-500">{lbl as string}</p>
                <p className={`text-xl font-bold mt-1 ${cls as string}`}>
                  ${(val as number).toLocaleString('es-CO')}
                </p>
              </div>
            ))}
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  {['Proveedor', 'NIT', 'Banco', 'Tipo / Nro. Cuenta', 'Semana Actual', 'Vencido', 'Gran Total'].map(h => (
                    <th key={h} className="p-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule!.supplierSummaries.map(s => (
                  <tr key={s.proveedor_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">{s.proveedor_nombre}</td>
                    <td className="p-3 text-gray-500">{s.nit}</td>
                    <td className="p-3 text-gray-600">{s.banco}</td>
                    <td className="p-3 text-gray-600">
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-1">{s.tipo_cuenta}</span>
                      {s.numero_cuenta}
                    </td>
                    <td className="p-3 text-blue-700 font-medium">${s.valor_semana_actual.toLocaleString('es-CO')}</td>
                    <td className="p-3">
                      <span className={s.valor_semanas_anteriores > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                        ${s.valor_semanas_anteriores.toLocaleString('es-CO')}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-gray-900">${s.gran_total.toLocaleString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td colSpan={4} className="p-3 text-right text-gray-700">TOTALES</td>
                  <td className="p-3 text-blue-700">${schedule!.totalCurrentWeek.toLocaleString('es-CO')}</td>
                  <td className="p-3 text-red-600">${schedule!.totalOverdueBalances.toLocaleString('es-CO')}</td>
                  <td className="p-3 text-gray-900 text-base">${schedule!.grandTotal.toLocaleString('es-CO')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 italic">{NOTA} {FIRMA}</p>
        </>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════
   REPORTE 3 — HISTORIAL DE PEDIDOS
══════════════════════════════════════════════ */
const OrdersHistoryReport: React.FC = () => {
  const { currentClient } = useClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders-report', currentClient?.id],
    queryFn:  () => orderRepo.findAll(currentClient?.id),
    enabled:  !!currentClient,
  });

  const handleExport = () => {
    const header = [
      [`HISTORIAL DE PEDIDOS — ${currentClient?.nombre_comercial ?? ''}`],
      [`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`],
      [],
      ['Fecha Emisión', 'Proveedor', 'Estado', 'Ítems', 'Total ($)', 'Fecha Recepción'],
    ];
    const rows = orders.map(o => [
      format(new Date(o.fecha_emision), 'dd/MM/yyyy'),
      o.proveedor_nombre ?? '',
      o.estado,
      o.detalles.length.toString(),
      o.total.toString(),
      o.fecha_recepcion ? format(new Date(o.fecha_recepcion), 'dd/MM/yyyy') : '—',
    ]);
    downloadCSV(
      `historial_pedidos_${currentClient?.nombre_comercial ?? 'cliente'}`,
      [...header, ...rows, [], [FIRMA], [NOTA]],
    );
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDIENTE: 'bg-yellow-100 text-yellow-700',
    APROBADA:  'bg-blue-100   text-blue-700',
    RECIBIDA:  'bg-green-100  text-green-700',
    CANCELADA: 'bg-red-100    text-red-700',
  };

  if (!currentClient) {
    return <p className="text-center text-gray-400 py-10">Selecciona un cliente.</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <p className="text-sm text-gray-500">{orders.length} orden{orders.length !== 1 ? 'es' : ''} en total</p>
        <Button size="sm" onClick={handleExport} disabled={orders.length === 0}>
          <FileSpreadsheet size={15} className="mr-1" /> Exportar a Excel
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No hay historial de pedidos para este cliente.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-50">
                {['Fecha', 'Proveedor', 'Estado', 'Ítems', 'Total', 'Recepción'].map(h => (
                  <th key={h} className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 text-gray-500">
                    {format(new Date(o.fecha_emision), 'dd/MM/yyyy')}
                  </td>
                  <td className="p-3 font-medium text-gray-900">{o.proveedor_nombre ?? '—'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.estado] ?? ''}`}>
                      {o.estado}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{o.detalles.length}</td>
                  <td className="p-3 font-bold text-gray-900">${o.total.toLocaleString('es-CO')}</td>
                  <td className="p-3 text-gray-400">
                    {o.fecha_recepcion
                      ? format(new Date(o.fecha_recepcion), 'dd/MM/yyyy')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-3 italic">{NOTA} {FIRMA}</p>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════ */
const TABS = [
  { key: 'menu',     label: 'Cartelera de Menús',    icon: <LayoutGrid    size={16} /> },
  { key: 'payments', label: 'Resumen de Pagos',       icon: <DollarSign    size={16} /> },
  { key: 'history',  label: 'Historial de Pedidos',   icon: <ClipboardList size={16} /> },
] as const;

type TabKey = typeof TABS[number]['key'];

export const ReportsPage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('menu');

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Reportes y Exportaciones</h2>
        <p className="text-gray-500 text-sm mt-1">Todos los reportes exportan a Excel (.csv) con firma de autoría</p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </div>

      <Card>
        {tab === 'menu'     && <MenuBoardReport />}
        {tab === 'payments' && <PaymentsReport />}
        {tab === 'history'  && <OrdersHistoryReport />}
      </Card>
    </div>
  );
};
