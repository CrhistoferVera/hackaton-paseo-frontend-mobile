import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { almacen } from './almacen';

export interface ItemCarrito {
  productoId: string;
  nombre: string;
  precioBs: number;
  cantidad: number;
  localId: string;
  local: string;
  ubicacion: string;
  dropId?: string | null;
}

interface Ctx {
  items: ItemCarrito[];
  agregar: (i: ItemCarrito) => void;
  cambiar: (productoId: string, cantidad: number) => void;
  vaciar: () => void;
  total: number;
  porLocal: { localId: string; local: string; ubicacion: string; items: ItemCarrito[]; subtotal: number }[];
}

const Contexto = createContext<Ctx>({} as Ctx);
const CLAVE = 'pp.carrito';

/** Carrito multi-local de PaseoYa (HU-Y04): al confirmar se crea un sub-pedido por local. */
export function ProveedorCarrito({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);

  useEffect(() => {
    void almacen.leer(CLAVE).then((v) => v && setItems(JSON.parse(v)));
  }, []);
  useEffect(() => {
    void almacen.guardar(CLAVE, JSON.stringify(items));
  }, [items]);

  const agregar = useCallback((i: ItemCarrito) => {
    setItems((xs) => {
      const e = xs.find((x) => x.productoId === i.productoId && (x.dropId ?? null) === (i.dropId ?? null));
      return e ? xs.map((x) => (x === e ? { ...x, cantidad: Math.min(20, x.cantidad + i.cantidad) } : x)) : [...xs, i];
    });
  }, []);
  const cambiar = useCallback((productoId: string, cantidad: number) => {
    setItems((xs) => (cantidad <= 0 ? xs.filter((x) => x.productoId !== productoId) : xs.map((x) => (x.productoId === productoId ? { ...x, cantidad } : x))));
  }, []);
  const vaciar = useCallback(() => setItems([]), []);

  const valor = useMemo(() => {
    const grupos = new Map<string, { localId: string; local: string; ubicacion: string; items: ItemCarrito[]; subtotal: number }>();
    for (const i of items) {
      const g = grupos.get(i.localId) ?? { localId: i.localId, local: i.local, ubicacion: i.ubicacion, items: [], subtotal: 0 };
      g.items.push(i);
      g.subtotal += i.precioBs * i.cantidad;
      grupos.set(i.localId, g);
    }
    return { items, agregar, cambiar, vaciar, total: items.reduce((a, i) => a + i.precioBs * i.cantidad, 0), porLocal: [...grupos.values()] };
  }, [items, agregar, cambiar, vaciar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useCarrito = () => useContext(Contexto);
