import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { useClient } from '../../contexts/ClientContext';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../../infra/supabase/client';

/* ── tipos ── */
type Detalle = { insumo_nombre: string };
type EntradaCartelera = {
  id: string;
  franja_nombre: string;
  ficha_nombre: string;
  num_raciones: number;
  detalles: Detalle[];
  costo_total_por_racion: number;
};

const SLOT_ORDER = ['DESAYUNO', 'REFRIGERIO_AM', 'ALMUERZO', 'REFRIGERIO_PM', 'CENA'];
const SLOT_LABELS: Record<string, string> = {
  DESAYUNO:      'Desayuno',
  REFRIGERIO_AM: 'Refrigerio A.M.',
  ALMUERZO:      'Almuerzo',
  REFRIGERIO_PM: 'Refrigerio P.M.',
  CENA:          'Cena',
};
const SLOT_EMOJI: Record<string, string> = {
  DESAYUNO:      '🌅',
  REFRIGERIO_AM: '🍎',
  ALMUERZO:      '🍽️',
  REFRIGERIO_PM: '🫐',
  CENA:          '🌙',
};

/* ── colores por franja para la cartelera ── */
const SLOT_BG: Record<string, string> = {
  DESAYUNO:      '#FFF7ED',
  REFRIGERIO_AM: '#FFFBEB',
  ALMUERZO:      '#EFF6FF',
  REFRIGERIO_PM: '#F5F3FF',
  CENA:          '#F0FDF4',
};
const SLOT_ACCENT: Record<string, string> = {
  DESAYUNO:      '#EA580C',
  REFRIGERIO_AM: '#D97706',
  ALMUERZO:      '#2563EB',
  REFRIGERIO_PM: '#7C3AED',
  CENA:          '#16A34A',
};

export const CarteleraPage: React.FC = () => {
  const { currentClient } = useClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [fecha, setFecha] = useState<Date>(new Date());

  const fechaStr = format(fecha, 'yyyy-MM-dd');
  const fechaLabel = format(fecha, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });

  /* ── Consulta: planificación del día con ingredientes ── */
  const { data: entradas = [], isLoading } = useQuery({
    queryKey: ['cartelera-dia', currentClient?.id, fechaStr],
    queryFn: async (): Promise<EntradaCartelera[]> => {
      if (!currentClient) return [];

      const { data, error } = await supabase
        .from('planificacion_menus')
        .select(`
          id,
          num_raciones,
          franjas_servicio ( nombre, orden ),
          fichas_tecnicas (
            nombre_plato,
            costo_total_por_racion,
            detalle_ficha_tecnica (
              insumos ( nombre )
            )
          )
        `)
        .eq('cliente_id', currentClient.id)
        .eq('fecha', fechaStr)
        .order('franjas_servicio(orden)');

      if (error) throw new Error(error.message);

      return (data ?? [])
        .map((row: any) => ({
          id:                    row.id,
          franja_nombre:         row.franjas_servicio?.nombre ?? '',
          ficha_nombre:          row.fichas_tecnicas?.nombre_plato ?? '',
          num_raciones:          row.num_raciones,
          costo_total_por_racion: Number(row.fichas_tecnicas?.costo_total_por_racion ?? 0),
          detalles:              (row.fichas_tecnicas?.detalle_ficha_tecnica ?? [])
                                   .map((d: any) => ({ insumo_nombre: d.insumos?.nombre ?? '—' })),
        }))
        .sort((a, b) => SLOT_ORDER.indexOf(a.franja_nombre) - SLOT_ORDER.indexOf(b.franja_nombre));
    },
    enabled: !!currentClient,
  });

  /* ── Imprimir ── */
  const handlePrint = () => window.print();

  /* ── Sin cliente ── */
  if (!currentClient) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">Selecciona un cliente para ver su cartelera.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Controles — se ocultan al imprimir */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Cartelera del Día</h2>
          <p className="text-gray-500 text-sm mt-1">{currentClient.nombre_comercial}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFecha(d => addDays(d, -1))}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={fechaStr}
            onChange={e => setFecha(new Date(e.target.value + 'T12:00:00'))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setFecha(d => addDays(d, 1))}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronRight size={16} />
          </button>
          <Button onClick={handlePrint} disabled={entradas.length === 0}>
            <Printer size={17} className="mr-2" /> Imprimir Cartelera
          </Button>
        </div>
      </div>

      {/* Cargando */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Sin menús */}
      {!isLoading && entradas.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-lg mb-2">No hay menús planificados para este día.</p>
          <p className="text-gray-400 text-sm">Ve al <strong>Planificador</strong> y asigna los platos del día.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          CARTELERA — este bloque se imprime
      ══════════════════════════════════════════════════ */}
      {!isLoading && entradas.length > 0 && (
        <div ref={printRef} className="cartelera-wrapper">
          {/* Estilos de impresión */}
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              .cartelera-wrapper, .cartelera-wrapper * { visibility: visible !important; }
              .cartelera-wrapper { position: fixed !important; top: 0; left: 0; width: 100%; }
              .no-print { display: none !important; }
              @page { size: A4 portrait; margin: 10mm; }
            }
            .cartelera-wrapper {
              font-family: 'Georgia', 'Times New Roman', serif;
            }
          `}</style>

          {/* Hoja */}
          <div style={{
            background: '#FFFFFF',
            border: '2px solid #1E3A5F',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '860px',
            margin: '0 auto',
          }}>
            {/* Cabecera */}
            <div style={{
              borderBottom: '3px solid #1E3A5F',
              paddingBottom: '20px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1E3A5F', margin: 0, letterSpacing: '1px' }}>
                  MENÚ DEL DÍA
                </h1>
                <p style={{ fontSize: '15px', color: '#4B5563', margin: '4px 0 0 0', fontWeight: 'bold' }}>
                  {currentClient.nombre_comercial}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '16px', color: '#1E3A5F', fontWeight: 'bold', margin: 0, textTransform: 'capitalize' }}>
                  {fechaLabel}
                </p>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0 0' }}>
                  {entradas.length} servicio{entradas.length !== 1 ? 's' : ''} planificado{entradas.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Franjas */}
            <div style={{ display: 'grid', gap: '16px' }}>
              {entradas.map(entrada => (
                <div
                  key={entrada.id}
                  style={{
                    background: SLOT_BG[entrada.franja_nombre] ?? '#F9FAFB',
                    border: `1.5px solid ${SLOT_ACCENT[entrada.franja_nombre] ?? '#E5E7EB'}`,
                    borderLeft: `5px solid ${SLOT_ACCENT[entrada.franja_nombre] ?? '#6B7280'}`,
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'grid',
                    gridTemplateColumns: '180px 1fr auto',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  {/* Franja */}
                  <div>
                    <p style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      color: SLOT_ACCENT[entrada.franja_nombre] ?? '#6B7280',
                      fontWeight: 'bold',
                      margin: '0 0 2px 0',
                    }}>
                      {SLOT_EMOJI[entrada.franja_nombre]} {SLOT_LABELS[entrada.franja_nombre] ?? entrada.franja_nombre}
                    </p>
                    <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                      <strong>{entrada.num_raciones}</strong> raciones
                    </p>
                  </div>

                  {/* Plato e ingredientes */}
                  <div>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: '0 0 6px 0' }}>
                      {entrada.ficha_nombre}
                    </p>
                    {entrada.detalles.length > 0 && (
                      <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontStyle: 'italic' }}>
                        {entrada.detalles.map(d => d.insumo_nombre).join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Costo */}
                  {entrada.costo_total_por_racion > 0 && (
                    <div style={{ textAlign: 'right', borderLeft: `1px solid ${SLOT_ACCENT[entrada.franja_nombre]}30`, paddingLeft: '16px' }}>
                      <p style={{ fontSize: '10px', color: '#9CA3AF', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Costo / ración</p>
                      <p style={{ fontSize: '16px', fontWeight: 'bold', color: SLOT_ACCENT[entrada.franja_nombre] ?? '#374151', margin: 0 }}>
                        ${Number(entrada.costo_total_por_racion).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Frase célebre del cliente */}
            {currentClient.frase_cartelera && (
              <div style={{
                marginTop: '28px',
                padding: '16px 24px',
                background: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                textAlign: 'center',
              }}>
                <p style={{
                  fontSize: '14px',
                  fontStyle: 'italic',
                  color: '#475569',
                  margin: 0,
                  lineHeight: '1.6',
                }}>
                  "{currentClient.frase_cartelera}"
                </p>
              </div>
            )}

            {/* Pie de página */}
            <div style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <p style={{ fontSize: '10px', color: '#9CA3AF', margin: 0 }}>
                Generado: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
              <p style={{ fontSize: '10px', color: '#9CA3AF', margin: 0, fontStyle: 'italic' }}>
                Elaborado por: Beronica Rosado — SIGC
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
