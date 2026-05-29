import React from 'react';
import { useClient } from '../../contexts/ClientContext';
import { useTreasury } from '../../hooks/useTreasury';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, CheckCircle, DollarSign, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n: number) => `$${Number(n).toLocaleString('es-CO')}`;

export const TreasuryPage: React.FC = () => {
  const { currentClient } = useClient();
  const {
    weeklySchedule,
    overdueAccounts,
    isLoading,
    recordPayment,
    isRecordingPayment,
  } = useTreasury(currentClient?.id ?? '');

  /* ── Exportar CSV ── */
  const handleExportCSV = () => {
    if (!weeklySchedule) return;

    const BOM = '\ufeff';
    const rows = [
      ['RESUMEN DE PAGOS SEMANALES'],
      [`Cliente: ${currentClient?.nombre_comercial ?? ''}`],
      [`Semana: ${format(weeklySchedule.weekStart, 'dd/MM/yyyy')} al ${format(weeklySchedule.weekEnd, 'dd/MM/yyyy')}`],
      [],
      ['Proveedor', 'NIT', 'Banco', 'Tipo Cuenta', 'Nro. Cuenta', 'Semana Actual ($)', 'Saldos Anteriores ($)', 'Gran Total ($)'],
      ...weeklySchedule.supplierSummaries.map(s => [
        s.proveedor_nombre, s.nit, s.banco, s.tipo_cuenta, s.numero_cuenta,
        s.valor_semana_actual.toString(),
        s.valor_semanas_anteriores.toString(),
        s.gran_total.toString(),
      ]),
      [],
      ['', '', '', '', 'TOTALES',
        weeklySchedule.totalCurrentWeek.toString(),
        weeklySchedule.totalOverdueBalances.toString(),
        weeklySchedule.grandTotal.toString(),
      ],
      [],
      ['Elaborado por: Beronica Rosado'],
      ['Formatos ejecutivos y profesionales regulados bajo control de autoría corporativa.'],
    ];

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `pagos_semanales_${currentClient?.nombre_comercial ?? 'cliente'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo CSV exportado correctamente');
  };

  /* ── Sin cliente ── */
  if (!currentClient) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Tesorería — Cuentas por Pagar</h2>
        <Card>
          <div className="text-center py-16">
            <DollarSign size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">Selecciona un cliente en la barra superior para ver sus obligaciones de pago.</p>
          </div>
        </Card>
      </div>
    );
  }

  /* ── Cargando ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Calculando obligaciones de pago…</p>
        </div>
      </div>
    );
  }

  const noObligations = !weeklySchedule || weeklySchedule.supplierSummaries.length === 0;

  return (
    <div>
      {/* Título */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tesorería — Cuentas por Pagar</h2>
          <p className="text-gray-500 text-sm mt-1">{currentClient.nombre_comercial}</p>
        </div>
        <Button onClick={handleExportCSV} disabled={noObligations}>
          <Download size={17} className="mr-2" /> Exportar Excel (.csv)
        </Button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Semana de pago</p>
              <p className="text-sm font-semibold text-gray-800">
                {weeklySchedule
                  ? `${format(weeklySchedule.weekStart, 'd MMM', { locale: es })} – ${format(weeklySchedule.weekEnd, 'd MMM yyyy', { locale: es })}`
                  : '—'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Semana actual</p>
              <p className="text-xl font-bold text-blue-600">
                {fmt(weeklySchedule?.totalCurrentWeek ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Saldos vencidos</p>
              <p className="text-xl font-bold text-red-600">
                {fmt(weeklySchedule?.totalOverdueBalances ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Gran total a pagar</p>
              <p className="text-xl font-bold text-green-700">
                {fmt(weeklySchedule?.grandTotal ?? 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabla de resumen por proveedor */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Resumen de Pagos por Proveedor</h3>
          {weeklySchedule && (
            <p className="text-xs text-gray-400">
              Semana del {format(weeklySchedule.weekStart, 'dd/MM/yyyy')} al {format(weeklySchedule.weekEnd, 'dd/MM/yyyy')}
            </p>
          )}
        </div>

        {noObligations ? (
          <div className="text-center py-10">
            <CheckCircle size={40} className="mx-auto text-green-300 mb-3" />
            <p className="text-green-600 font-medium">No hay obligaciones de pago esta semana.</p>
            <p className="text-gray-400 text-sm mt-1">
              Las CxP se generan automáticamente al aprobar órdenes de compra.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Proveedor', 'NIT', 'Banco', 'Tipo / Nro. Cuenta', 'Semana Actual', 'Saldo Vencido', 'Gran Total', 'Acción'].map(h => (
                    <th key={h} className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeklySchedule!.supplierSummaries.map(s => (
                  <tr key={s.proveedor_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 text-sm font-semibold text-gray-900">{s.proveedor_nombre}</td>
                    <td className="p-3 text-sm text-gray-500">{s.nit}</td>
                    <td className="p-3 text-sm text-gray-600">{s.banco}</td>
                    <td className="p-3 text-sm text-gray-600">
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-1">{s.tipo_cuenta}</span>
                      {s.numero_cuenta}
                    </td>
                    <td className="p-3 text-sm font-medium text-blue-700">{fmt(s.valor_semana_actual)}</td>
                    <td className="p-3">
                      <span className={`text-sm font-medium ${s.valor_semanas_anteriores > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {fmt(s.valor_semanas_anteriores)}
                      </span>
                    </td>
                    <td className="p-3 text-sm font-bold text-gray-900">{fmt(s.gran_total)}</td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="success"
                        loading={isRecordingPayment}
                        onClick={() => {
                          if (confirm(`¿Registrar pago de ${fmt(s.gran_total)} a ${s.proveedor_nombre}?`)) {
                            toast.success(`Pago a ${s.proveedor_nombre} registrado`);
                          }
                        }}
                      >
                        <CheckCircle size={13} className="mr-1" /> Pagar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td colSpan={4} className="p-3 text-sm font-bold text-gray-700 text-right">TOTALES</td>
                  <td className="p-3 text-sm font-bold text-blue-700">{fmt(weeklySchedule!.totalCurrentWeek)}</td>
                  <td className="p-3 text-sm font-bold text-red-600">{fmt(weeklySchedule!.totalOverdueBalances)}</td>
                  <td className="p-3 text-sm font-bold text-gray-900 text-lg">{fmt(weeklySchedule!.grandTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Obligaciones vencidas en detalle */}
      {overdueAccounts && overdueAccounts.length > 0 && (
        <div className="mt-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-red-600" />
              <h3 className="font-semibold text-red-700">
                Obligaciones Vencidas ({overdueAccounts.length})
              </h3>
            </div>
            <div className="space-y-3">
              {overdueAccounts.map(account => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200 flex-wrap gap-3"
                >
                  <div>
                    <p className="font-semibold text-red-900">
                      {(account as any).proveedores?.razon_social ?? 'Proveedor'}
                    </p>
                    <p className="text-sm text-red-600 mt-0.5">
                      Venció el {format(new Date(account.fecha_vencimiento), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-red-500">Saldo pendiente</p>
                      <p className="text-xl font-bold text-red-800">{fmt(account.saldo_pendiente)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="success"
                      loading={isRecordingPayment}
                      onClick={() => {
                        if (confirm(`¿Marcar como pagada esta obligación de ${fmt(account.saldo_pendiente)}?`)) {
                          recordPayment(account.id);
                          toast.success('Pago registrado');
                        }
                      }}
                    >
                      <CheckCircle size={14} className="mr-1" /> Pagar Ahora
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Pie de página */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
        <p className="text-xs text-gray-400 italic">
          Formatos ejecutivos y profesionales regulados bajo control de autoría corporativa. Elaborado por: <strong>Beronica Rosado</strong>
        </p>
      </div>
    </div>
  );
};
