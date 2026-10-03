import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Aviso, Boton, Cargando, Etiqueta, Pantalla, Segmentado, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api, urlArchivo } from '@/lib/api';
import { useCarrito } from '@/lib/carrito';
import { bs, ubicacion, useDatos } from '@/lib/datos';

/** HU-Y03: ficha con foto, precio, stock, local, piso y sector. Favoritos (HU-Y10). */
export default function Producto() {
  const { id, drop } = useLocalSearchParams<{ id: string; drop?: string }>();
  const router = useRouter();
  const { agregar } = useCarrito();
  const { datos: p, setDatos } = useDatos<any>(`/paseoya/productos/${id}`);
  const { datos: drops } = useDatos<any[]>(drop ? '/cliente/drops' : null);
  const [cantidad, setCantidad] = useState('1');
  const [msg, setMsg] = useState<string | null>(null);
  if (!p) return <Cargando />;
  const d = drops?.find((x) => x.drop_id === drop);
  const precio = d ? Number(d.precio_especial) : Number(p.precio_bs);

  return (
    <Pantalla>
      {p.foto_url ? <Image source={{ uri: urlArchivo(p.foto_url)! }} style={{ width: '100%', aspectRatio: 1.4 }} contentFit="cover" /> : <View style={{ width: '100%', aspectRatio: 2.2, backgroundColor: C.veladura }} />}
      <T v="senal" oro>{p.categoria}</T>
      <T v="titulo" style={{ fontSize: 28 }}>{p.nombre}</T>
      <T tenue>{p.descripcion}</T>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <T style={{ fontFamily: F.display, fontSize: 40 }}>{bs(precio)}</T>
        {d && <T tenue style={{ textDecorationLine: 'line-through' }}>{bs(p.precio_bs)}</T>}
        {d && <Etiqueta texto="Precio Drop" tono="oro" />}
      </View>
      <T v="chico" oro>Sumas {Math.floor(precio)} pts al retirar</T>
      <View style={{ borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 12, gap: 4 }}>
        <T style={{ fontFamily: 'Inter_500Medium' }}>{p.local}</T>
        <T v="chico" tenue>{ubicacion(p)} · retiro de {String(p.horario_apertura).slice(0, 5)} a {String(p.horario_cierre).slice(0, 5)}</T>
        <T v="chico" tenue>{p.stock > 0 ? `${p.stock} disponibles` : 'Agotado'}</T>
      </View>
      {p.stock > 0 && (
        <>
          <Segmentado opciones={['1', '2', '3', '4'].map((v) => ({ valor: v, texto: v }))} valor={cantidad} onCambio={setCantidad} />
          <Boton
            titulo={`Agregar al carrito · ${bs(precio * Number(cantidad))}`}
            onPress={() => {
              agregar({ productoId: p.id, nombre: p.nombre, precioBs: precio, cantidad: Number(cantidad), localId: p.local_id, local: p.local, ubicacion: ubicacion(p), dropId: d ? drop : null });
              setMsg('Agregado. Puedes sumar productos de otros locales en el mismo pedido.');
            }}
          />
        </>
      )}
      <Boton titulo={p.favorito ? 'Quitar de favoritos' : 'Guardar en favoritos'} variante="claro" onPress={async () => { const r = await api('/cliente/favoritos', { cuerpo: { productoId: p.id } }); setDatos({ ...p, favorito: r.favorito }); }} />
      <Aviso texto={msg} tipo="exito" />
      {msg && <Boton titulo="Ir al carrito" variante="oro" onPress={() => router.push('/carrito')} />}
    </Pantalla>
  );
}
