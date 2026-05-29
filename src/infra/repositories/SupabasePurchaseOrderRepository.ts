import { supabase } from '../supabase/client';
import type { IPurchaseOrderRepository } from '../../core/repositories';
import type { PurchaseOrder, CreatePurchaseOrderDTO, OrderStatus } from '../../core/entities/PurchaseOrder';

const ORDER_SELECT = `
  *,
  proveedores ( razon_social ),
  detalle_orden_compra (
    id, insumo_id, cantidad, precio_unitario, subtotal,
    insumos ( nombre, unidad_medida )
  )
`;

function mapOrder(item: any): PurchaseOrder {
  return {
    ...item,
    proveedor_nombre: item.proveedores?.razon_social ?? '—',
    subtotal_productos: Number(item.subtotal_productos ?? 0),
    valor_domicilio:    Number(item.valor_domicilio ?? 0),
    total:              Number(item.total ?? 0),
    notas:              item.notas ?? '',
    detalles: (item.detalle_orden_compra ?? []).map((d: any) => ({
      id:               d.id,
      insumo_id:        d.insumo_id,
      insumo_nombre:    d.insumos?.nombre ?? '—',
      cantidad:         Number(d.cantidad),
      precio_unitario:  Number(d.precio_unitario),
      subtotal:         Number(d.subtotal),
    })),
  };
}

export class SupabasePurchaseOrderRepository implements IPurchaseOrderRepository {
  async findAll(clientId?: string): Promise<PurchaseOrder[]> {
    let q = supabase
      .from('ordenes_compra')
      .select(ORDER_SELECT)
      .order('fecha_emision', { ascending: false });
    if (clientId) q = q.eq('cliente_id', clientId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapOrder);
  }

  async findById(id: string): Promise<PurchaseOrder | null> {
    const { data, error } = await supabase
      .from('ordenes_compra').select(ORDER_SELECT).eq('id', id).single();
    if (error) return null;
    return mapOrder(data);
  }

  async create(dto: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
    let subtotalProductos = 0;
    const detalles = dto.detalles.map(d => {
      const sub = Number(d.cantidad) * Number(d.precio_unitario);
      subtotalProductos += sub;
      return {
        insumo_id:       d.insumo_id,
        cantidad:        Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
        subtotal:        sub,
      };
    });

    const valorDomicilio = Number(dto.valor_domicilio ?? 0);
    const total          = subtotalProductos + valorDomicilio;

    const { data: order, error: orderErr } = await supabase
      .from('ordenes_compra')
      .insert([{
        proveedor_id:       dto.proveedor_id,
        cliente_id:         dto.cliente_id,
        fecha_emision:      new Date().toISOString().split('T')[0],
        estado:             'PENDIENTE',
        subtotal_productos: subtotalProductos,
        valor_domicilio:    valorDomicilio,
        total,
        notas:              dto.notas ?? '',
      }])
      .select()
      .single();
    if (orderErr) throw new Error(orderErr.message);

    const { error: detErr } = await supabase
      .from('detalle_orden_compra')
      .insert(detalles.map(d => ({ ...d, orden_id: order.id })));
    if (detErr) throw new Error(detErr.message);

    return (await this.findById(order.id))!;
  }

  // Nueva función para editar una orden (reemplaza detalles y recalcula totales)
  async updateOrder(
    id: string,
    dto: { valor_domicilio: number; notas: string; detalles: { insumo_id: string; cantidad: number; precio_unitario: number }[] },
  ): Promise<PurchaseOrder> {
    let subtotalProductos = 0;
    const detalles = dto.detalles.map(d => {
      const sub = Number(d.cantidad) * Number(d.precio_unitario);
      subtotalProductos += sub;
      return {
        insumo_id:       d.insumo_id,
        cantidad:        Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
        subtotal:        sub,
        orden_id:        id,
      };
    });

    const valorDomicilio = Number(dto.valor_domicilio ?? 0);
    const total = subtotalProductos + valorDomicilio;

    // Borrar detalles viejos
    const { error: delErr } = await supabase
      .from('detalle_orden_compra')
      .delete()
      .eq('orden_id', id);
    if (delErr) throw new Error(delErr.message);

    // Insertar nuevos
    const { error: detErr } = await supabase
      .from('detalle_orden_compra')
      .insert(detalles);
    if (detErr) throw new Error(detErr.message);

    // Actualizar cabecera
    const { error: headErr } = await supabase
      .from('ordenes_compra')
      .update({ subtotal_productos: subtotalProductos, valor_domicilio: valorDomicilio, total, notas: dto.notas })
      .eq('id', id);
    if (headErr) throw new Error(headErr.message);

    return (await this.findById(id))!;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<PurchaseOrder> {
    const fields: Record<string, unknown> = { estado: status };
    if (status === 'RECIBIDA') fields.fecha_recepcion = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('ordenes_compra').update(fields).eq('id', id);
    if (error) throw new Error(error.message);
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('ordenes_compra').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
