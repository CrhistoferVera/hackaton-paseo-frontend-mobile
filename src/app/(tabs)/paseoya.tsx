import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Boton, Campo, Fila, IrA, Pantalla, Seccion, Segmentado, T, Vacio } from '@/components/ui';
import { C } from '@/constants/theme';
import { api, urlArchivo } from '@/lib/api';
import { useCarrito } from '@/lib/carrito';
import { bs, useDatos } from '@/lib/datos';

/** HU-Y01 (categorías), HU-Y02 (buscador global), destacados, carrito y pedidos. */
export default function PaseoYa() {
  const router = useRouter();
  const { items, total } = useCarrito();
  const [ambito, setAmbito] = useState<'' | 'comida' | 'tiendas'>('');
  const [categoria, setCategoria] = useState<any | null>(null);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<any[] | null>(null);
  const [orden, setOrden] = useState<'precio' | 'nombre'>('precio');
  const { datos: cats } = useDatos<any[]>(`/paseoya/categorias${ambito ? `?ambito=${ambito}` : ''}`);
  const { datos: destacados } = useDatos<any[]>('/paseoya/destacados');
  const { datos: productos } = useDatos<any[]>(categoria ? `/paseoya/productos?categoria=${categoria.id}` : null);
  const { datos: drops } = useDatos<any[]>('/cliente/drops');

  async function buscar(o = orden) {
    if (q.trim().length < 2) return setResultados(null);
    setResultados(await api(`/paseoya/buscar?q=${encodeURIComponent(q)}&orden=${o}`).catch(() => []));
  }

  const lista = resultados ?? (categoria ? productos : null);

  return (
    <Pantalla>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T v="titulo">PaseoYa</T>
        <IrA href="/pedidos"><T v="senal" tenue>Mis pedidos</T></IrA>
      </View>
      <T tenue v="chico">Pide en los locales del Paseo y retira en persona. Sumas puntos al retirar.</T>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="Buscar en todos los locales" value={q} onChangeText={setQ} onSubmitEditing={() => void buscar()} returnKeyType="search" placeholder="audífonos bluetooth" />
        </View>
        <Boton titulo="Buscar" onPress={() => void buscar()} />
      </View>

      {!!drops?.length && (
        <Seccion titulo="Precios desbloqueados por Drop">
          {drops.map((d) => (
            <Fila key={d.drop_id} titulo={d.producto} detalle={`${d.local} · normal ${bs(d.precio_bs)}`} valor={bs(d.precio_especial)} valorOro href={`/producto/${d.producto_id}?drop=${d.drop_id}`} />
          ))}
        </Seccion>
      )}

      {resultados ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T v="senal" tenue>{resultados.length} resultados</T>
          <Segmentado opciones={[{ valor: 'precio', texto: 'Precio' }, { valor: 'nombre', texto: 'Nombre' }]} valor={orden} onCambio={(o) => { setOrden(o); void buscar(o); }} />
        </View>
      ) : (
        <>
          <Segmentado opciones={[{ valor: '', texto: 'Todo' }, { valor: 'comida', texto: 'Plaza de comidas' }, { valor: 'tiendas', texto: 'Tiendas' }]} valor={ambito} onCambio={(a) => { setAmbito(a); setCategoria(null); }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {cats?.map((c) => (
              <Pressable key={c.id} onPress={() => setCategoria(categoria?.id === c.id ? null : c)} style={{ borderWidth: 1, borderColor: categoria?.id === c.id ? C.tinta : C.lineaFuerte, backgroundColor: categoria?.id === c.id ? C.tinta : 'transparent', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 2 }}>
                <T v="chico" style={{ color: categoria?.id === c.id ? C.papel : C.tinta }}>{c.nombre} · {c.productos}</T>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {lista ? (
        lista.length ? lista.map((p) => <ProductoFila key={p.id} p={p} />) : <Vacio texto={resultados ? `No encontramos «${q}». Registramos tu búsqueda para que el Paseo sepa que hace falta.` : 'Sin productos en esta categoría.'} />
      ) : (
        <Seccion titulo="Destacados">
          {destacados?.map((p) => <ProductoFila key={p.id} p={p} />)}
        </Seccion>
      )}

      {items.length > 0 && (
        <Boton titulo={`Ver carrito · ${bs(total)}`} variante="oro" onPress={() => router.push('/carrito')} />
      )}
    </Pantalla>
  );
}

function ProductoFila({ p }: { p: any }) {
  return (
    <IrA href={`/producto/${p.id}`} estilo={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.linea, alignItems: 'center' }}>
        {p.foto_url ? <Image source={{ uri: urlArchivo(p.foto_url)! }} style={{ width: 52, height: 52 }} /> : <View style={{ width: 52, height: 52, backgroundColor: C.veladura }} />}
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: 'Inter_500Medium' }}>{p.nombre}</T>
          <T v="chico" tenue>{p.local} · {p.piso} · Local {p.numero_local}{p.stock <= 3 ? ` · quedan ${p.stock}` : ''}</T>
        </View>
        <T v="subtitulo">{bs(p.precio_bs)}</T>
    </IrA>
  );
}
