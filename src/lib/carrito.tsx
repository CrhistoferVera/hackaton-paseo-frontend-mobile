import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { almacen } from './almacen';

import { agregarItem, cambiarItem, type ItemCarrito, type TipoCarrito, type CartSection, getCartSection, sectionToTipo, tipoToSection } from './carrito-modelo';
export { claveItem, getCartSection, sectionToTipo, tipoToSection, type ItemCarrito, type TipoCarrito, type CartSection } from './carrito-modelo';

function useCarritoPersistido(tipo: TipoCarrito) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cola = useRef(Promise.resolve());
  const clave = 'pp.carrito.' + tipo;
  useEffect(() => {
    let vivo = true;
    void almacen.leer(clave).then(v => {
      if (!vivo) return;
      const datos = v ? JSON.parse(v) : [];
      if (!Array.isArray(datos)) throw new Error('Carrito no válido');
      const normalizados = datos.map((it: ItemCarrito) => ({
        ...it,
        ambito: it.ambito ?? (tipo === 'comida' ? 'comida' : 'tiendas'),
        tipo: it.tipo ?? tipo,
      }));
      setItems(normalizados);
      setCargado(true);
    }).catch(() => { if (vivo) setError('No se pudo recuperar el carrito. Vuelve a abrir la app.'); });
    return () => { vivo = false; };
  }, [clave, tipo]);
  useEffect(() => {
    if (!cargado) return;
    cola.current = cola.current.then(() => almacen.guardar(clave, JSON.stringify(items)))
      .catch(() => setError('No se pudo guardar el carrito en el dispositivo.'));
  }, [items, clave, cargado]);
  const agregar = useCallback((i: ItemCarrito) => {
    if (!cargado) return;
    const normalizado: ItemCarrito = {
      ...i,
      ambito: i.ambito ?? (tipo === 'comida' ? 'comida' : 'tiendas'),
      tipo: i.tipo ?? tipo,
    };
    setItems(xs => agregarItem(xs, normalizado));
  }, [cargado, tipo]);
  const cambiar = useCallback((key: string, cantidad: number) => {
    if (!cargado) return;
    setItems(xs => cambiarItem(xs,key,cantidad));
  }, [cargado]);
  const vaciar = useCallback(() => { if (cargado) setItems([]); }, [cargado]);
  return useMemo(() => {
    const grupos = new Map<string, { localId: string; local: string; ubicacion: string; items: ItemCarrito[]; subtotal: number }>();
    for (const i of items) {
      const g = grupos.get(i.localId) ?? { localId:i.localId,local:i.local,ubicacion:i.ubicacion,items:[],subtotal:0 };
      g.items.push(i); g.subtotal += i.precioBs*i.cantidad; grupos.set(i.localId,g);
    }
    return { items, agregar, cambiar, vaciar, cargado, error, cantidadTotal:items.reduce((a,i) => a+i.cantidad,0), total:items.reduce((a,i) => a+i.precioBs*i.cantidad,0), porLocal:[...grupos.values()] };
  }, [items, agregar, cambiar, vaciar, cargado, error]);
}
const Contexto = createContext<{ comida: ReturnType<typeof useCarritoPersistido>; retail: ReturnType<typeof useCarritoPersistido> } | null>(null);
export function ProveedorCarrito({ children }: { children: React.ReactNode }) {
  const comida = useCarritoPersistido('comida');
  const retail = useCarritoPersistido('retail');
  return <Contexto.Provider value={{ comida, retail }}>{children}</Contexto.Provider>;
}
export function useCarrito() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('Falta ProveedorCarrito');
  return valor;
}
