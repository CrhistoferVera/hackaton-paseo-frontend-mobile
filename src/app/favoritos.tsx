import { Cargando, Fila, Pantalla, Seccion, Vacio } from '@/components/ui';
import { bs, ubicacion, useDatos } from '@/lib/datos';

/** HU-Y10: productos y locales favoritos. */
export default function Favoritos() {
  const { datos } = useDatos<any>('/cliente/favoritos');
  if (!datos) return <Cargando />;
  return (
    <Pantalla>
      <Seccion titulo="Productos">
        {datos.productos.length ? datos.productos.map((p: any) => <Fila key={p.id} titulo={p.nombre} detalle={`${p.local} · ${ubicacion(p)}`} valor={bs(p.precio_bs)} href={`/producto/${p.id}`} />) : <Vacio texto="Guarda productos desde su ficha." />}
      </Seccion>
      <Seccion titulo="Locales">
        {datos.locales.length ? datos.locales.map((l: any) => <Fila key={l.id} titulo={l.nombre} detalle={`${l.categoria} · ${ubicacion(l)}`} />) : <Vacio texto="Guarda locales desde el mapa." />}
      </Seccion>
    </Pantalla>
  );
}
