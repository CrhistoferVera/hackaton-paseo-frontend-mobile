import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Aviso, Boton, Cargando, Etiqueta, Pantalla, Segmentado, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api, urlArchivo } from '@/lib/api';
import { useCarrito } from '@/lib/carrito';
import { bs, ubicacion, useDatos } from '@/lib/datos';

/** HU-Y03: ficha con foto, precio, stock, local, piso y sector. Favoritos (HU-Y10). */
export default function Producto() {
  const { id, drop } = useLocalSearchParams<{ id: string; drop?: string }>();
  const router = useRouter();
  const carritos = useCarrito();
  const [seleccion, setSeleccion] = useState<Record<string, string>>({});
  const [fotoVariante, setFotoVariante] = useState<string | null>(null);
  const { datos: p, setDatos } = useDatos<any>(`/paseoya/productos/${id}`);
  const { datos: drops } = useDatos<any[]>(drop ? '/cliente/drops' : null);
  const [cantidad, setCantidad] = useState('1');
  const [msg, setMsg] = useState<string | null>(null);
  if (!p) return <Cargando />;
  const d = drops?.find((x) => x.drop_id === drop);
  const tipo = p.ambito === 'comida' ? 'comida' : 'retail';
  const carrito = carritos[tipo];
  const grupos = p.variantes ?? [];
  const opciones = grupos.flatMap((g: any) => g.opciones.filter((v: any) => seleccion[g.id] === v.id));
  const completo = grupos.every((g: any) => opciones.some((v: any) => v.grupo_id === g.id));
  const precio = Math.round(((d ? Number(d.precio_especial) : Number(p.precio_bs)) + opciones.reduce((s: number, v: any) => s + (v.precio_bs == null ? 0 : Number(v.precio_bs) - Number(p.precio_bs)), 0)) * 100) / 100;
  const stock = grupos.length ? (opciones.length ? Math.min(...opciones.map((v: any) => v.stock)) : 0) : p.stock;
  const foto = fotoVariante ?? p.foto_url;

  return (
    <Pantalla>
      {foto ? <Image source={{ uri: urlArchivo(foto)! }} style={{ width: '100%', aspectRatio: 1.4 }} contentFit="cover" /> : <View style={{ width: '100%', aspectRatio: 2.2, backgroundColor: C.veladura }} />}
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
        <T v="chico" tenue>{!completo ? 'Elige tus opciones' : stock > 0 ? `${stock} disponibles` : 'Agotado'}</T>
      </View>
      {grupos.map((g: any) => <View key={g.id} style={{gap:8}}>
        <T v="senal">{g.titulo} · obligatorio</T>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
          {g.opciones.map((v: any) => <Pressable key={v.id} disabled={v.stock <= 0} accessibilityRole="button" accessibilityState={{selected:seleccion[g.id]===v.id,disabled:v.stock<=0}}
            onPress={() => { setSeleccion(x => ({...x,[g.id]:v.id})); setFotoVariante(v.foto_url ?? null); setMsg(null); }}
            style={{borderWidth:1,borderColor:C.lineaFuerte,padding:10,backgroundColor:seleccion[g.id]===v.id ? C.tinta : 'transparent',opacity:v.stock<=0 ? 0.4 : 1}}>
            <T style={{color:seleccion[g.id]===v.id ? C.papel : C.tinta}}>{v.nombre}{v.stock<=0 ? ' · agotado' : ''}{v.precio_bs != null ? ' · '+bs(v.precio_bs) : ''}</T>
          </Pressable>)}
        </View>
      </View>)}
      {(grupos.length > 0 || stock > 0) && (
        <>
          <Segmentado opciones={['1', '2', '3', '4'].map((v) => ({ valor: v, texto: v }))} valor={cantidad} onCambio={setCantidad} />
          <Boton
            titulo={`Agregar al carrito · ${bs(precio * Number(cantidad))}`}
            deshabilitado={!carrito.cargado || !completo || stock < Number(cantidad) || precio < 0}
            onPress={() => {
              carrito.agregar({ productoId: p.id, nombre: p.nombre, precioBs: precio, cantidad: Number(cantidad), localId: p.local_id, local: p.local, ubicacion: ubicacion(p), dropId: d ? drop : null, varianteIds: opciones.map((v: any) => v.id), varianteDetalle: grupos.map((g: any) => `${g.titulo}: ${opciones.find((v: any) => v.grupo_id===g.id)?.nombre}`).join(' | ') });
              setMsg(`Agregado al carrito de ${tipo}.`);
            }}
          />
        </>
      )}
      <Boton titulo={p.favorito ? 'Quitar de favoritos' : 'Guardar en favoritos'} variante="claro" onPress={async () => { const r = await api('/cliente/favoritos', { cuerpo: { productoId: p.id } }); setDatos({ ...p, favorito: r.favorito }); }} />
      <Aviso texto={msg} tipo="exito" />
      {msg && <Boton titulo="Ir al carrito" variante="oro" onPress={() => router.push(`/carrito?tipo=${tipo}`)} />}
    </Pantalla>
  );
}
