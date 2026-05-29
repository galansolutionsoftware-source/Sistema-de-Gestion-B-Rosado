-- ============================================================
-- SIGC v4 — SQL COMPLETO
-- Paso 1: Borrar todo lo existente
-- Paso 2: Crear todo desde cero con mejoras
-- ============================================================

-- ── BORRAR POLÍTICAS ────────────────────────────────────────
drop policy if exists "authenticated_all_clientes"               on clientes;
drop policy if exists "authenticated_all_proveedores"            on proveedores;
drop policy if exists "authenticated_all_insumos"                on insumos;
drop policy if exists "authenticated_all_fichas_tecnicas"        on fichas_tecnicas;
drop policy if exists "authenticated_all_detalle_ficha_tecnica"  on detalle_ficha_tecnica;
drop policy if exists "authenticated_all_planificacion_menus"    on planificacion_menus;
drop policy if exists "authenticated_all_ordenes_compra"         on ordenes_compra;
drop policy if exists "authenticated_all_detalle_orden_compra"   on detalle_orden_compra;
drop policy if exists "authenticated_all_inventario"             on inventario;
drop policy if exists "authenticated_all_movimientos_inventario" on movimientos_inventario;
drop policy if exists "authenticated_all_cuentas_por_pagar"      on cuentas_por_pagar;
drop policy if exists "authenticated_all_categorias_insumos"     on categorias_insumos;
drop policy if exists "authenticated_all_franjas_servicio"       on franjas_servicio;
drop policy if exists "auth_all_clientes"               on clientes;
drop policy if exists "auth_all_proveedores"            on proveedores;
drop policy if exists "auth_all_insumos"                on insumos;
drop policy if exists "auth_all_fichas_tecnicas"        on fichas_tecnicas;
drop policy if exists "auth_all_detalle_ficha_tecnica"  on detalle_ficha_tecnica;
drop policy if exists "auth_all_planificacion_menus"    on planificacion_menus;
drop policy if exists "auth_all_ordenes_compra"         on ordenes_compra;
drop policy if exists "auth_all_detalle_orden_compra"   on detalle_orden_compra;
drop policy if exists "auth_all_inventario"             on inventario;
drop policy if exists "auth_all_movimientos_inventario" on movimientos_inventario;
drop policy if exists "auth_all_cuentas_por_pagar"      on cuentas_por_pagar;
drop policy if exists "auth_all_categorias_insumos"     on categorias_insumos;
drop policy if exists "auth_all_franjas_servicio"       on franjas_servicio;

-- ── BORRAR TABLAS ───────────────────────────────────────────
drop table if exists cuentas_por_pagar          cascade;
drop table if exists movimientos_inventario     cascade;
drop table if exists inventario                 cascade;
drop table if exists detalle_orden_compra       cascade;
drop table if exists ordenes_compra             cascade;
drop table if exists planificacion_menus        cascade;
drop table if exists detalle_ficha_tecnica      cascade;
drop table if exists fichas_tecnicas            cascade;
drop table if exists franjas_servicio           cascade;
drop table if exists insumos                    cascade;
drop table if exists categorias_insumos         cascade;
drop table if exists proveedores                cascade;
drop table if exists clientes                   cascade;

-- ── EXTENSIONES ─────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ============================================================
-- CLIENTES
-- + frase_cartelera: frase célebre o texto que aparece en cartelera impresa
-- + distancia_km: distancia desde bodega central (para calcular domicilio)
-- ============================================================
create table clientes (
  id                uuid        primary key default gen_random_uuid(),
  nombre_comercial  text        not null,
  tipo              text        not null check (tipo in ('UT','COLEGIO','RESTAURANTE','UNIVERSIDAD','EMPRESA')),
  nit               text        not null unique,
  direccion         text        not null default '',
  telefono          text        not null default '',
  email             text        not null default '',
  distancia_km      numeric(8,2) not null default 0,
  frase_cartelera   text        not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- PROVEEDORES
-- ============================================================
create table proveedores (
  id             uuid        primary key default gen_random_uuid(),
  razon_social   text        not null,
  nit            text        not null unique,
  banco          text        not null default '',
  tipo_cuenta    text        not null check (tipo_cuenta in ('AHORROS','CORRIENTE')),
  numero_cuenta  text        not null default '',
  dias_credito   integer     not null default 0,
  telefono       text        not null default '',
  productos_que_vende text   not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================
-- CATEGORIAS DE INSUMOS
-- ============================================================
create table categorias_insumos (
  id         uuid        primary key default gen_random_uuid(),
  nombre     text        not null unique check (nombre in (
               'MATERIAS_PRIMAS','PRODUCTOS_ASEO','DESECHABLES','CONDIMENTOS')),
  created_at timestamptz not null default now()
);

insert into categorias_insumos (nombre) values
  ('MATERIAS_PRIMAS'),('PRODUCTOS_ASEO'),('DESECHABLES'),('CONDIMENTOS');

-- ============================================================
-- INSUMOS (catálogo global)
-- ============================================================
create table insumos (
  id            uuid          primary key default gen_random_uuid(),
  codigo        text          not null unique,
  nombre        text          not null,
  categoria_id  uuid          not null references categorias_insumos(id),
  unidad_medida text          not null check (unidad_medida in (
                  'GRAMOS','KILOGRAMOS','LITROS','UNIDADES','MILILITROS')),
  precio_base   numeric(12,2) not null default 0,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

-- ============================================================
-- FRANJAS DE SERVICIO
-- ============================================================
create table franjas_servicio (
  id         uuid        primary key default gen_random_uuid(),
  nombre     text        not null unique check (nombre in (
               'DESAYUNO','REFRIGERIO_AM','ALMUERZO','REFRIGERIO_PM','CENA')),
  orden      integer     not null,
  created_at timestamptz not null default now()
);

insert into franjas_servicio (nombre, orden) values
  ('DESAYUNO',1),('REFRIGERIO_AM',2),('ALMUERZO',3),('REFRIGERIO_PM',4),('CENA',5);

-- ============================================================
-- FICHAS TÉCNICAS (por cliente)
-- ============================================================
create table fichas_tecnicas (
  id                    uuid          primary key default gen_random_uuid(),
  cliente_id            uuid          not null references clientes(id) on delete cascade,
  nombre_plato          text          not null,
  descripcion           text          not null default '',
  costo_total_por_racion numeric(12,4) not null default 0,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now()
);

-- ============================================================
-- DETALLE FICHA TÉCNICA
-- ============================================================
create table detalle_ficha_tecnica (
  id                      uuid          primary key default gen_random_uuid(),
  ficha_id                uuid          not null references fichas_tecnicas(id) on delete cascade,
  insumo_id               uuid          not null references insumos(id),
  gramaje_neto_por_racion numeric(10,3) not null,
  created_at              timestamptz   not null default now()
);

-- ============================================================
-- PLANIFICACIÓN DE MENÚS (por cliente)
-- ============================================================
create table planificacion_menus (
  id           uuid        primary key default gen_random_uuid(),
  cliente_id   uuid        not null references clientes(id) on delete cascade,
  fecha        date        not null,
  franja_id    uuid        not null references franjas_servicio(id),
  ficha_id     uuid        not null references fichas_tecnicas(id),
  num_raciones integer     not null default 1 check (num_raciones > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (cliente_id, fecha, franja_id)
);

-- ============================================================
-- ÓRDENES DE COMPRA
-- + valor_domicilio: costo del flete/envío a ese cliente específico
--   Este valor varía por cliente (distancia) y se suma al total
--   para calcular el costo real por ración con flete incluido
-- ============================================================
create table ordenes_compra (
  id               uuid          primary key default gen_random_uuid(),
  proveedor_id     uuid          not null references proveedores(id),
  cliente_id       uuid          not null references clientes(id),
  fecha_emision    date          not null default current_date,
  fecha_recepcion  date,
  estado           text          not null default 'PENDIENTE'
                     check (estado in ('PENDIENTE','APROBADA','RECIBIDA','CANCELADA')),
  subtotal_productos numeric(14,2) not null default 0,
  valor_domicilio  numeric(10,2) not null default 0,
  total            numeric(14,2) not null default 0,
  -- total = subtotal_productos + valor_domicilio (calculado en app)
  notas            text          not null default '',
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now()
);

-- ============================================================
-- DETALLE ORDEN DE COMPRA
-- *** FIX CRÍTICO: subtotal es columna normal, NO generada ***
-- Postgres GENERATED ALWAYS no permite insertar valores externos.
-- La app calcula subtotal = cantidad * precio_unitario antes de insertar.
-- ============================================================
create table detalle_orden_compra (
  id               uuid          primary key default gen_random_uuid(),
  orden_id         uuid          not null references ordenes_compra(id) on delete cascade,
  insumo_id        uuid          not null references insumos(id),
  cantidad         numeric(10,3) not null check (cantidad > 0),
  precio_unitario  numeric(12,2) not null check (precio_unitario >= 0),
  subtotal         numeric(14,2) not null default 0,
  -- subtotal calculado por la app: cantidad * precio_unitario
  created_at       timestamptz   not null default now()
);

-- ============================================================
-- INVENTARIO — stock actual por cliente
-- ============================================================
create table inventario (
  id                   uuid          primary key default gen_random_uuid(),
  cliente_id           uuid          not null references clientes(id) on delete cascade,
  insumo_id            uuid          not null references insumos(id),
  stock_actual         numeric(12,3) not null default 0,
  ultima_actualizacion timestamptz   not null default now(),
  unique (cliente_id, insumo_id)
);

-- ============================================================
-- MOVIMIENTOS DE INVENTARIO — Kardex
-- ============================================================
create table movimientos_inventario (
  id           uuid          primary key default gen_random_uuid(),
  cliente_id   uuid          not null references clientes(id),
  insumo_id    uuid          not null references insumos(id),
  tipo         text          not null check (tipo in ('ENTRADA','SALIDA')),
  cantidad     numeric(12,3) not null check (cantidad > 0),
  referencia_id text         not null,
  fecha        timestamptz   not null default now(),
  descripcion  text          not null default ''
);

-- ============================================================
-- CUENTAS POR PAGAR
-- ============================================================
create table cuentas_por_pagar (
  id               uuid          primary key default gen_random_uuid(),
  orden_compra_id  uuid          not null references ordenes_compra(id),
  proveedor_id     uuid          not null references proveedores(id),
  cliente_id       uuid          not null references clientes(id),
  valor_obligacion numeric(14,2) not null,
  fecha_vencimiento date         not null,
  estado           text          not null default 'PENDIENTE'
                     check (estado in ('PENDIENTE','PAGADA','VENCIDA')),
  saldo_pendiente  numeric(14,2) not null,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table clientes               enable row level security;
alter table proveedores            enable row level security;
alter table categorias_insumos     enable row level security;
alter table insumos                enable row level security;
alter table franjas_servicio       enable row level security;
alter table fichas_tecnicas        enable row level security;
alter table detalle_ficha_tecnica  enable row level security;
alter table planificacion_menus    enable row level security;
alter table ordenes_compra         enable row level security;
alter table detalle_orden_compra   enable row level security;
alter table inventario             enable row level security;
alter table movimientos_inventario enable row level security;
alter table cuentas_por_pagar      enable row level security;

create policy "sigc_clientes"               on clientes               for all to authenticated using (true) with check (true);
create policy "sigc_proveedores"            on proveedores            for all to authenticated using (true) with check (true);
create policy "sigc_categorias"             on categorias_insumos     for all to authenticated using (true) with check (true);
create policy "sigc_insumos"                on insumos                for all to authenticated using (true) with check (true);
create policy "sigc_franjas"                on franjas_servicio       for all to authenticated using (true) with check (true);
create policy "sigc_fichas"                 on fichas_tecnicas        for all to authenticated using (true) with check (true);
create policy "sigc_detalle_ficha"          on detalle_ficha_tecnica  for all to authenticated using (true) with check (true);
create policy "sigc_planificacion"          on planificacion_menus    for all to authenticated using (true) with check (true);
create policy "sigc_ordenes"                on ordenes_compra         for all to authenticated using (true) with check (true);
create policy "sigc_detalle_orden"          on detalle_orden_compra   for all to authenticated using (true) with check (true);
create policy "sigc_inventario"             on inventario             for all to authenticated using (true) with check (true);
create policy "sigc_movimientos"            on movimientos_inventario for all to authenticated using (true) with check (true);
create policy "sigc_cxp"                    on cuentas_por_pagar      for all to authenticated using (true) with check (true);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================
create index idx_planificacion_cliente_fecha   on planificacion_menus    (cliente_id, fecha);
create index idx_cxp_cliente_estado            on cuentas_por_pagar      (cliente_id, estado);
create index idx_cxp_vencimiento               on cuentas_por_pagar      (fecha_vencimiento);
create index idx_inventario_cliente            on inventario             (cliente_id);
create index idx_movimientos_cliente_fecha     on movimientos_inventario (cliente_id, fecha desc);
create index idx_ordenes_cliente               on ordenes_compra         (cliente_id);
create index idx_ordenes_estado                on ordenes_compra         (estado);
create index idx_fichas_cliente                on fichas_tecnicas        (cliente_id);
create index idx_detalle_ficha                 on detalle_ficha_tecnica  (ficha_id);
create index idx_detalle_orden                 on detalle_orden_compra   (orden_id);
