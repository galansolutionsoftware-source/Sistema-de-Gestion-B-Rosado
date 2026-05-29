// ============================================================
// ADAPTER: SupabaseAccountPayableRepository
// ============================================================

import { supabase } from '../supabase/client';
import type { IAccountPayableRepository } from '../../core/repositories';
import type { AccountPayable, SupplierPaymentSummary } from '../../core/entities/AccountPayable';

export class SupabaseAccountPayableRepository implements IAccountPayableRepository {
  async findBySupplier(supplierId: string, clientId: string): Promise<AccountPayable[]> {
    const { data, error } = await supabase
      .from('cuentas_por_pagar')
      .select('*, proveedores ( razon_social, nit, banco, tipo_cuenta, numero_cuenta )')
      .eq('proveedor_id', supplierId)
      .eq('cliente_id', clientId)
      .order('fecha_vencimiento');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOverdue(clientId: string): Promise<AccountPayable[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('cuentas_por_pagar')
      .select('*, proveedores ( razon_social )')
      .eq('cliente_id', clientId)
      .eq('estado', 'PENDIENTE')
      .lt('fecha_vencimiento', today);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findByDateRange(clientId: string, startDate: Date, endDate: Date): Promise<AccountPayable[]> {
    const { data, error } = await supabase
      .from('cuentas_por_pagar')
      .select('*, proveedores ( razon_social, nit, banco, tipo_cuenta, numero_cuenta )')
      .eq('cliente_id', clientId)
      .gte('fecha_vencimiento', startDate.toISOString().split('T')[0])
      .lte('fecha_vencimiento', endDate.toISOString().split('T')[0]);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async createFromOrder(purchaseOrderId: string): Promise<AccountPayable> {
    const { data: order, error: orderError } = await supabase
      .from('ordenes_compra')
      .select('*, proveedores ( dias_credito )')
      .eq('id', purchaseOrderId)
      .single();

    if (orderError) throw new Error(orderError.message);

    const issueDate = new Date(order.fecha_emision);
    const creditDays: number = (order.proveedores as any)?.dias_credito ?? 0;
    const dueDate = new Date(issueDate);
    dueDate.setDate(issueDate.getDate() + creditDays);

    const { data, error } = await supabase
      .from('cuentas_por_pagar')
      .insert([{
        orden_compra_id: purchaseOrderId,
        proveedor_id: order.proveedor_id,
        cliente_id: order.cliente_id,
        valor_obligacion: order.total,
        fecha_vencimiento: dueDate.toISOString().split('T')[0],
        estado: 'PENDIENTE',
        saldo_pendiente: order.total,
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async markAsPaid(id: string): Promise<void> {
    const { error } = await supabase
      .from('cuentas_por_pagar')
      .update({ estado: 'PAGADA', saldo_pendiente: 0 })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async getWeeklyPaymentSummary(
    clientId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<SupplierPaymentSummary[]> {
    const weekAccounts = await this.findByDateRange(clientId, weekStart, weekEnd);
    const overdueAccounts = await this.findOverdue(clientId);

    const map = new Map<string, SupplierPaymentSummary>();

    const addToMap = (account: AccountPayable, isOverdue: boolean) => {
      const supplierId = account.proveedor_id;
      const providerData = (account as any).proveedores ?? {};

      if (!map.has(supplierId)) {
        map.set(supplierId, {
          proveedor_id: supplierId,
          proveedor_nombre: providerData.razon_social ?? 'Unknown',
          nit: providerData.nit ?? '',
          banco: providerData.banco ?? '',
          tipo_cuenta: providerData.tipo_cuenta ?? '',
          numero_cuenta: providerData.numero_cuenta ?? '',
          valor_semana_actual: 0,
          valor_semanas_anteriores: 0,
          gran_total: 0,
        });
      }

      const entry = map.get(supplierId)!;
      if (isOverdue) {
        entry.valor_semanas_anteriores += account.saldo_pendiente;
      } else {
        entry.valor_semana_actual += account.saldo_pendiente;
      }
      entry.gran_total += account.saldo_pendiente;
    };

    weekAccounts.forEach((a) => addToMap(a, false));
    overdueAccounts.forEach((a) => addToMap(a, true));

    return Array.from(map.values());
  }

  async carryOverdueBalances(clientId: string): Promise<AccountPayable[]> {
    const overdue = await this.findOverdue(clientId);

    for (const account of overdue) {
      await supabase
        .from('cuentas_por_pagar')
        .update({ estado: 'VENCIDA' })
        .eq('id', account.id);
    }

    return overdue;
  }
}
