-- ============================================================
-- SIGC v5 — MIGRACIONES INCREMENTALES
-- Aplica sobre la v4 existente. NO borra datos.
-- ============================================================

-- 1. Agregar cliente_id a insumos (insumos ahora son por cliente)
alter table insumos add column if not exists cliente_id uuid references clientes(id) on delete cascade;

-- Índice para buscar insumos por cliente
create index if not exists idx_insumos_cliente_id on insumos(cliente_id);

-- 2. Agregar cliente_id a proveedores (proveedores ahora son por cliente)
alter table proveedores add column if not exists cliente_id uuid references clientes(id) on delete cascade;
create index if not exists idx_proveedores_cliente_id on proveedores(cliente_id);

-- 3. Eliminar la restricción UNIQUE que bloquea múltiples platos por franja/día
--    (antes era unique(cliente_id, fecha, franja_id), ahora se permite múltiples)
alter table planificacion_menus drop constraint if exists planificacion_menus_cliente_id_fecha_franja_id_key;

-- 4. Agregar unidades de medida faltantes a insumos
alter table insumos drop constraint if exists insumos_unidad_medida_check;
alter table insumos add constraint insumos_unidad_medida_check
  check (unidad_medida in ('GRAMOS','KILOGRAMOS','LITROS','UNIDADES','MILILITROS','LIBRAS'));

-- 5. Agregar campos opcionales a proveedores si no existen
alter table proveedores add column if not exists telefono text not null default '';
alter table proveedores add column if not exists productos_que_vende text not null default '';

-- ============================================================
-- POLÍTICAS RLS (ajuste para filtrar por cliente)
-- ============================================================

-- Insumos: cualquier usuario autenticado puede ver/editar sus insumos
drop policy if exists "auth_all_insumos" on insumos;
create policy "auth_all_insumos" on insumos
  for all to authenticated using (true) with check (true);

-- Proveedores: igual
drop policy if exists "auth_all_proveedores" on proveedores;
create policy "auth_all_proveedores" on proveedores
  for all to authenticated using (true) with check (true);

-- Planificación: sin restricción unique, pero con RLS normal
drop policy if exists "auth_all_planificacion_menus" on planificacion_menus;
create policy "auth_all_planificacion_menus" on planificacion_menus
  for all to authenticated using (true) with check (true);

-- ============================================================
-- NOTA: Si tienes insumos/proveedores existentes sin cliente_id,
-- asígnalos manualmente a un cliente con:
--   UPDATE insumos SET cliente_id = '<uuid-cliente>' WHERE cliente_id IS NULL;
--   UPDATE proveedores SET cliente_id = '<uuid-cliente>' WHERE cliente_id IS NULL;
-- ============================================================
