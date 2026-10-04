import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Aviso, Boton, Cargando, Etiqueta, Pantalla, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api } from '@/lib/api';
import { useCarrito } from '@/lib/carrito';
import { bs, ubicacion, useAccion, useDatos } from '@/lib/datos';
import { useTiempoReal } from '@/lib/tiempo-real';

const ORDEN = ['recibido', 'preparando', 'listo', 'entregado'];
const ETIQUETA: Record<string, string> = {
  recibido: 'Pedido recibido', confirmado: 'Confirmado por el local', preparando: 'Preparando', listo: 'Listo para recoger',
  cliente_llego: 'Avisaste que llegaste', entregado: 'Entregado', vencido: 'Vencido',
};

/** HU-Y06 (estado en tiempo real), HU-Y07 (QR + PIN por local), HU-Y08 (Llegué), HU-Y11 (comprobante), HU-Y10 (recompra). */
export default function Pedido() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const carritos = useCarrito();
  const { datos: p, recargar } = useDatos<any>(`/cliente/pedidos/${id}`);
  const a = useAccion();
  useTiempoReal({ pedido: () => void recargar(), connect: () => void recargar() });

  if (!p) return <Cargando />;
  const activos = p.subpedidos.filter((s: any) => !['entregado', 'vencido'].includes(s.estado));
  const yaAviso = p.subpedidos.every((s: any) => s.llego_en || ['entregado', 'vencido'].includes(s.estado));

  async function llegue() {
    await a.ejecutar(() => api(`/cliente/pedidos/${id}/llegue`, { cuerpo: {} }));
    void recargar();
  }

  async function comprobante() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled) return;
    const archivo = r.assets[0];
    const fd = new FormData();
    if (Platform.OS === 'web') {
      const blob = await (await fetch(archivo.uri)).blob();
      fd.append('archivo', blob, 'comprobante.jpg');
    } else {
      fd.append('archivo', { uri: archivo.uri, name: 'comprobante.jpg', type: archivo.mimeType ?? 'image/jpeg' } as any);
    }
    await a.ejecutar(() => api(`/cliente/pedidos/${id}/comprobante`, { formulario: fd }));
    void recargar();
  }

  async function repetir() {
    const items = await a.ejecutar(() => api<any[]>(`/cliente/pedidos/${id}/repetir`, { cuerpo: {} }));
    if (!items) return;
    for (const i of items) carritos[i.producto.ambito === 'comida' ? 'comida' : 'retail'].agregar({ productoId: i.productoId, nombre: i.producto.nombre, precioBs: i.precioBs, varianteIds: i.varianteIds, varianteDetalle: i.varianteDetalle, cantidad: i.cantidad, localId: i.producto.local_id, local: i.producto.local, ubicacion: ubicacion(i.producto) });
    router.push(`/carrito?tipo=${p.tipo}`);
  }

  return (
    <Pantalla>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T style={{ fontFamily: F.datoMedio, fontSize: 18 }}>{p.codigo}</T>
        <T v="chico" tenue>{p.tipo === 'retail' ? `Llegada estimada: ${String(p.fecha_estimada_retiro).slice(0,10)}` : 'Seguimiento en vivo'}</T>
      </View>
      <T style={{ fontFamily: F.display, fontSize: 38 }}>{bs(p.total_bs)}</T>
      <T v="chico" oro>+{Math.floor(Number(p.total_bs))} pts al retirar · paga en cada local</T>

      {p.subpedidos.map((s: any) => {
        const orden = p.tipo === 'retail' ? ['recibido','listo','entregado'] : ORDEN;
        const paso = orden.indexOf(s.estado === 'confirmado' ? 'recibido' : s.estado === 'cliente_llego' ? 'listo' : s.estado);
        return (
          <View key={s.id} style={{ borderTopWidth: 1, borderTopColor: C.lineaFuerte, paddingTop: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: 'Inter_600SemiBold' }}>{s.local}</T>
                <T v="chico" tenue>{ubicacion(s)}</T>
              </View>
              <T style={{ fontFamily: F.datoMedio, fontSize: 18, letterSpacing: 2 }}>PIN {s.pin}</T>
            </View>
            {s.items.map((i: any) => <T key={i.id} v="chico">{i.cantidad} × {i.nombre}{i.variante_detalle ? ` · ${i.variante_detalle}` : ''} · {bs(i.precio_bs * i.cantidad)}</T>)}
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {orden.map((e, k) => <View key={e} style={{ flex: 1, height: 3, backgroundColor: s.estado === 'vencido' ? C.alerta : k < paso ? C.tinta : k === paso ? C.oroBrillo : C.linea }} />)}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T v="chico">{ETIQUETA[s.estado]}</T>
              {s.estado === 'entregado' ? <Etiqueta texto={`+${s.puntos} pts`} tono="oro" /> : <T v="chico" tenue>{Math.max(paso + 1, 1)} de {orden.length}</T>}
            </View>
            <T v="chico" tenue>{orden.map(e => ETIQUETA[e]).join(' → ')}</T>
            {p.tipo === 'comida' && ['recibido','confirmado','preparando'].includes(s.estado) && <T v="chico" oro>{s.tiempo_preparacion_min != null ? `Preparación estimada: ${s.tiempo_preparacion_min} min` : 'El restaurante confirmará la preparación'}</T>}
            {['listo', 'cliente_llego'].includes(s.estado) && (
              <View style={{ alignItems: 'center', backgroundColor: '#fff', padding: 12, borderWidth: 1, borderColor: C.linea }}>
                <QRCode value={s.qr} size={150} color={C.tinta} />
                <T v="chico" tenue style={{ marginTop: 6 }}>Muestra este QR o dicta el PIN en {s.local}</T>
              </View>
            )}
            {s.pago === 'qr_anticipado' && (s.comprobante_url ? <Etiqueta texto="Comprobante enviado" tono="exito" /> : <Boton titulo="Adjuntar comprobante del pago QR" variante="claro" onPress={() => void comprobante()} />)}
          </View>
        );
      })}

      {activos.length > 0 && !yaAviso && <Boton titulo="Llegué al Paseo" variante="oro" onPress={() => void llegue()} cargando={a.enviando} />}
      {activos.length > 0 && yaAviso && <Aviso texto="Avisamos a los locales que llegaste. Te entregarán cuando el pedido esté listo." tipo="exito" />}
      {!activos.length && <Boton titulo="Volver a pedir lo mismo" variante="claro" onPress={() => void repetir()} />}
      <Aviso texto={a.error} tipo="error" />
    </Pantalla>
  );
}
