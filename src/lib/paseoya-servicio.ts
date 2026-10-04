import { useCallback, useEffect, useState } from 'react';
import { api, urlArchivo } from './api';

export interface Business {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string | null;
  fotos: string[];
  piso: string | null;
  sector?: string | null;
  tipo: 'food' | 'shop';
  activo: boolean;
  numeroLocal?: string | null;
  horarioApertura?: string | null;
  horarioCierre?: string | null;
}

export interface Promotion {
  id: string;
  titulo: string;
  imagen: string | null;
  tipo: 'food' | 'shop';
  negocioId?: string | null;
  negocioNombre?: string | null;
  orden: number;
  activo: boolean;
}

/**
 * Función de transformación para mapear filas de locales de la base de datos al modelo estándar.
 */
export function mapBusinessRow(row: any): Business {
  const rawPiso = row.piso || row.floor || row.nivel || row.planta || '';
  let pisoFormateado: string | null = null;
  if (rawPiso) {
    if (rawPiso === 'T' || rawPiso.toLowerCase() === 'pb') {
      pisoFormateado = 'Planta Baja';
    } else if (rawPiso.startsWith('N')) {
      pisoFormateado = `Piso ${rawPiso.slice(1)}`;
    } else if (rawPiso.toLowerCase().includes('piso') || rawPiso.toLowerCase().includes('planta') || rawPiso.toLowerCase().includes('feria')) {
      pisoFormateado = rawPiso;
    } else {
      pisoFormateado = `Piso ${rawPiso}`;
    }
  }

  const rawFotos: string[] = Array.isArray(row.fotos) && row.fotos.length > 0
    ? row.fotos
    : (row.foto_url ? [row.foto_url] : []);
  const mappedFotos = rawFotos.map((f: string) => urlArchivo(f)!).filter(Boolean);
  const rawImagen = row.foto_url || row.imagen_url || row.banner_url || (rawFotos.length > 0 ? rawFotos[0] : null);

  return {
    id: String(row.id),
    nombre: row.nombre ?? '',
    descripcion: row.descripcion ?? '',
    imagen: urlArchivo(rawImagen),
    fotos: mappedFotos,
    piso: pisoFormateado,
    sector: row.sector ?? null,
    tipo: row.ambito === 'tiendas' || row.tipo === 'shop' || row.tipo === 'retail' ? 'shop' : 'food',
    activo: Boolean(row.activo ?? true),
    numeroLocal: row.numero_local ?? null,
    horarioApertura: row.horario_apertura ?? null,
    horarioCierre: row.horario_cierre ?? null,
  };
}

/**
 * Función de transformación para mapear promociones de la base de datos al modelo estándar.
 */
export function mapPromotionRow(row: any): Promotion {
  const rawImagen = row.imagen_url || row.foto_url || row.banner_url || null;
  return {
    id: String(row.id),
    titulo: row.titulo ?? '',
    imagen: urlArchivo(rawImagen),
    tipo: row.tipo === 'shop' || row.ambito === 'tiendas' ? 'shop' : 'food',
    negocioId: row.negocio_id ?? row.local_id ?? null,
    negocioNombre: row.negocio_nombre ?? row.local ?? null,
    orden: Number(row.orden ?? 0),
    activo: Boolean(row.activo ?? true),
  };
}

/**
 * Obtiene los negocios (restaurantes o tiendas) activos de la base de datos real.
 */
export async function getBusinesses({ type }: { type: 'food' | 'shop' }): Promise<Business[]> {
  const ambito = type === 'food' ? 'comida' : 'tiendas';
  const rows = await api<any[]>(`/paseoya/locales?ambito=${ambito}`);
  if (!Array.isArray(rows)) return [];
  return rows.map(mapBusinessRow).filter((b) => b.activo);
}

/**
 * Obtiene las promociones activas de esa sección, ordenadas por orden y filtradas por vigencia.
 */
export async function getPromotions({ type }: { type: 'food' | 'shop' }): Promise<Promotion[]> {
  try {
    // 1. Intentar endpoint dedicado de promociones PaseoYa
    const rows = await api<any[]>(`/paseoya/promociones?tipo=${type}`);
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map(mapPromotionRow).filter((p) => p.activo).sort((a, b) => a.orden - b.orden);
    }
  } catch {
    // Continuar con fallback si el endpoint aún no está disponible
  }

  try {
    // 2. Fallback al endpoint existente /cliente/promociones
    const rows = await api<any[]>('/cliente/promociones');
    if (Array.isArray(rows)) {
      return rows
        .map(mapPromotionRow)
        .filter((p) => p.tipo === type && p.activo)
        .sort((a, b) => a.orden - b.orden);
    }
  } catch {
    // Si no hay respuesta o falla conexión
  }

  return [];
}

/**
 * Hook para consultar negocios según la sección (food / shop).
 */
export function useBusinesses(section: 'food' | 'shop') {
  const [data, setData] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const negocios = await getBusinesses({ type: section });
      setData(negocios);
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar negocios');
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

/**
 * Hook para consultar promociones según la sección (food / shop).
 */
export function usePromotions(section: 'food' | 'shop') {
  const [data, setData] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const promos = await getPromotions({ type: section });
      setData(promos);
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar promociones');
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
