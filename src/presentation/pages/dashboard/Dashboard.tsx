import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClient } from '../../contexts/ClientContext';
import { Card } from '../../components/ui/Card';
import { TrendingUp, DollarSign, Package, AlertCircle } from 'lucide-react';
import { SupabaseInventoryRepository } from '../../../infra/repositories/SupabaseInventoryRepository';
import { SupabasePurchaseOrderRepository } from '../../../infra/repositories/SupabasePurchaseOrderRepository';
import { SupabaseAccountPayableRepository } from '../../../infra/repositories/SupabaseAccountPayableRepository';
import { ScheduleWeeklyPaymentsUseCase } from '../../../core/use-cases/treasury/ScheduleWeeklyPaymentsUseCase';
import { format } from 'date-fns';

const inventoryRepo = new SupabaseInventoryRepository();
const orderRepo = new SupabasePurchaseOrderRepository();
const accountRepo = new SupabaseAccountPayableRepository();
const scheduleUseCase = new ScheduleWeeklyPaymentsUseCase(accountRepo);

export const Dashboard: React.FC = () => {
  const { currentClient } = useClient();
  const clientId = currentClient?.id ?? '';

  const { data: stock = [] } = useQuery({
    queryKey: ['inv-stock', clientId],
    queryFn: () => inventoryRepo.getAllStock(clientId),
    enabled: !!clientId,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders-dash', clientId],
    queryFn: () => orderRepo.findAll(clientId),
    enabled: !!clientId,
  });

  const { data: schedule } = useQuery({
    queryKey: ['schedule-dash', clientId],
    queryFn: () => scheduleUseCase.execute(clientId),
    enabled: !!clientId,
  });

  const { data: overdue = [] } = useQuery({
    queryKey: ['overdue-dash', clientId],
    queryFn: () => accountRepo.findOverdue(clientId),
    enabled: !!clientId,
  });

  const pendingOrders = orders.filter(o => o.estado === 'PENDIENTE');
  const lowStock = stock.filter(s => s.stock_actual < 10);

  const stats = [
    {
      title: 'Ítems en Bodega',
      value: stock.length.toString(),
      sub: `${lowStock.length} con stock bajo`,
      icon: Package,
      color: 'bg-blue-500',
      warn: lowStock.length > 0,
    },
    {
      title: 'Órdenes Pendientes',
      value: pendingOrders.length.toString(),
      sub: `${orders.length} total`,
      icon: TrendingUp,
      color: 'bg-yellow-500',
      warn: false,
    },
    {
      title: 'CxP Esta Semana',
      value: schedule ? `$${schedule.totalCurrentWeek.toLocaleString()}` : '—',
      sub: 'Semana actual',
      icon: DollarSign,
      color: 'bg-green-500',
      warn: false,
    },
    {
      title: 'Saldos Vencidos',
      value: schedule ? `$${schedule.totalOverdueBalances.toLocaleString()}` : '—',
      sub: `${overdue.length} obligación${overdue.length !== 1 ? 'es' : ''}`,
      icon: AlertCircle,
      color: 'bg-red-500',
      warn: overdue.length > 0,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-600">
          {currentClient?.nombre_comercial ?? 'Selecciona un cliente para comenzar'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.warn ? 'text-red-600' : 'text-gray-800'}`}>{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon size={24} className="text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Órdenes Recientes">
          <div className="space-y-2">
            {orders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No hay órdenes de compra</p>
            ) : orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{o.proveedor_nombre ?? 'Proveedor'}</p>
                  <p className="text-xs text-gray-500">{format(new Date(o.fecha_emision), 'dd/MM/yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">${o.total.toLocaleString()}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${o.estado === 'RECIBIDA' ? 'bg-green-100 text-green-700' : o.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                    {o.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Obligaciones Vencidas">
          <div className="space-y-2">
            {overdue.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-green-600 font-medium">✓ Sin obligaciones vencidas</p>
              </div>
            ) : overdue.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <p className="text-sm font-medium text-red-800">{a.proveedores?.razon_social ?? 'Proveedor'}</p>
                  <p className="text-xs text-red-500">Venció: {format(new Date(a.fecha_vencimiento), 'dd/MM/yyyy')}</p>
                </div>
                <span className="text-sm font-bold text-red-700">${a.saldo_pendiente.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
