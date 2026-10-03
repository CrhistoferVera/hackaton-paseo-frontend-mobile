import { useSyncExternalStore } from 'react';

export interface RutaJarvis {
  metros: number;
  minutos?: number;
  pasos: string[];
  nodos: { id: string; piso: string; x: number; y: number; tipo: string; nombre: string }[];
  destino?: string;
}

export interface OrdenJarvis {
  id: string;
  disparador: string;
  texto: string;
  motor?: string;
  latenciaMs?: number;
  ruta?: RutaJarvis;
  ar?: { tipo: 'drop' | 'moneda'; codigo: string; lugar: string };
  acciones?: { etiqueta: string; ruta: string }[];
}

/** Última ruta que dio Jarvis: la pantalla de ruta la lee sin volver a pedirla. */
let rutaActual: RutaJarvis | null = null;
const oyentes = new Set<() => void>();

export function mostrarRuta(r: RutaJarvis) {
  rutaActual = r;
  oyentes.forEach((f) => f());
}

export function useRutaActual() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => rutaActual,
    () => rutaActual,
  );
}
