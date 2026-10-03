import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from './api';

/** Carga una ruta del backend cada vez que la pantalla gana foco. */
export function useDatos<T = any>(ruta: string | null) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    if (!ruta) return;
    setCargando(true);
    try {
      setDatos(await api<T>(ruta));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [ruta]);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  return { datos, error, cargando, recargar, setDatos };
}

export function useAccion() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ejecutar = useCallback(async <T,>(fn: () => Promise<T>) => {
    setEnviando(true);
    setError(null);
    try {
      return await fn();
    } catch (e: any) {
      setError(e.message);
      return undefined;
    } finally {
      setEnviando(false);
    }
  }, []);
  return { enviando, error, ejecutar, setError };
}

const nf0 = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const bs = (n: number | string | null | undefined) => `Bs ${nf2.format(Number(n ?? 0))}`;
export const entero = (n: number | string | null | undefined) => nf0.format(Number(n ?? 0));
export const fecha = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', timeZone: 'America/La_Paz' }).replace('.', '') : '—';
export const fechaHora = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' }).replace('.', '') : '—';
export const hora = (d?: string | Date | null) => (d ? new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' }) : '—');
export const ubicacion = (l: any) => [l.piso, l.sector ? `Sector ${l.sector}` : null, l.numero_local ? `Local ${l.numero_local}` : null].filter(Boolean).join(' · ');
