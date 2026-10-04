export type TipoCarrito = 'comida' | 'retail';
export type CartSection = 'food' | 'shop';

export interface ItemCarrito {
  productoId: string;
  nombre: string;
  precioBs: number;
  cantidad: number;
  localId: string;
  local: string;
  ubicacion: string;
  dropId?: string | null;
  varianteIds?: string[];
  varianteDetalle?: string;
  ambito?: 'comida' | 'tiendas';
  tipo?: TipoCarrito;
}

export const claveItem = (i: ItemCarrito) => [i.productoId, i.dropId ?? '', ...(i.varianteIds ?? []).slice().sort()].join('|');

/**
 * Clasificación de cada item por el tipo del negocio/producto (ámbito: "comida" vs "tiendas") existente en BD.
 */
export function getCartSection(item: ItemCarrito): CartSection {
  if (item.ambito === 'tiendas' || item.tipo === 'retail') {
    return 'shop';
  }
  return 'food';
}

export function sectionToTipo(section: CartSection): TipoCarrito {
  return section === 'food' ? 'comida' : 'retail';
}

export function tipoToSection(tipo: TipoCarrito): CartSection {
  return tipo === 'comida' ? 'food' : 'shop';
}

export function agregarItem(xs: ItemCarrito[], i: ItemCarrito): ItemCarrito[] {
  const key = claveItem(i);
  return xs.some(x => claveItem(x) === key) ? xs.map(x => claveItem(x) === key ? {...i,cantidad:Math.min(20,x.cantidad+i.cantidad)} : x) : [...xs,{...i,cantidad:Math.min(20,i.cantidad)}];
}
export function cambiarItem(xs: ItemCarrito[], key: string, cantidad: number): ItemCarrito[] {
  return cantidad <= 0 ? xs.filter(x => claveItem(x) !== key) : xs.map(x => claveItem(x) === key ? {...x,cantidad:Math.min(20,cantidad)} : x);
}
