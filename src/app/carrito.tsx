import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Aviso, Boton, Pantalla, Segmentado, T, Vacio } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api } from '@/lib/api';
import { useCarrito } from '@/lib/carrito';
import { bs, useAccion } from '@/lib/datos';

/** Franjas de 30 minutos desde la próxima media hora, hora boliviana. */
function franjas() {
  const out: { inicio: Date; fin: Date; texto: string }[] = [];
  const ahora = new Date();
  const base = new Date(Math.ceil((ahora.getTime() + 20 * 60_000) / (30 * 60_000)) * 30 * 60_000);
  for (let i = 0; i < 16; i++) {
    const inicio = new Date(base.getTime() + i * 30 * 60_000);
    const fin = new Date(inicio.getTime() + 30 * 60_000);
    const h = (d: Date) => d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' });
    out.push({ inicio, fin, texto: `${h(inicio)}–${h(fin)}` });
  }
  return out;
}

/** HU-Y04 (carrito multi-local), HU-Y05 (franja de retiro, pago en el local), HU-Y11 (pago QR anticipado). */
export default function Carrito() {
  const router = useRouter();
  const { porLocal, total, cambiar, vaciar, items } = useCarrito();
  const opciones = useMemo(franjas, []);
  const [franja, setFranja] = useState(0);
  const [pago, setPago] = useState<'en_local' | 'qr_anticipado'>('en_local');
  const a = useAccion();

  async function confirmar() {
    const f = opciones[franja];
    const r = await a.ejecutar(() =>
      api('/cliente/pedidos', {
        cuerpo: { items: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad, dropId: i.dropId ?? null })), franjaInicio: f.inicio.toISOString(), franjaFin: f.fin.toISOString(), pago },
      }),
    );
    if (r) {
      vaciar();
      router.replace(`/pedido/${r.pedidoId}`);
    }
  }

  if (!items.length) return <Pantalla><Vacio texto="Tu carrito está vacío. Busca productos en PaseoYa." /></Pantalla>;

  return (
    <Pantalla>
      {porLocal.map((g) => (
        <View key={g.localId} style={{ borderTopWidth: 1, borderTopColor: C.lineaFuerte, paddingTop: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <T style={{ fontFamily: 'Inter_600SemiBold' }}>{g.local}</T>
              <T v="chico" tenue>{g.ubicacion}</T>
            </View>
            <T>{bs(g.subtotal)}</T>
          </View>
          {g.items.map((i) => (
            <View key={i.productoId + (i.dropId ?? '')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <T style={{ flex: 1 }}>{i.nombre}{i.dropId ? ' · precio Drop' : ''}</T>
              <Pressable onPress={() => cambiar(i.productoId, i.cantidad - 1)} hitSlop={8}><T v="subtitulo">−</T></Pressable>
              <T style={{ fontFamily: F.datoMedio, minWidth: 18, textAlign: 'center' }}>{i.cantidad}</T>
              <Pressable onPress={() => cambiar(i.productoId, i.cantidad + 1)} hitSlop={8}><T v="subtitulo">+</T></Pressable>
            </View>
          ))}
        </View>
      ))}
      <View style={{ borderTopWidth: 2, borderTopColor: C.tinta, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T v="senal" tenue>Total</T>
        <T style={{ fontFamily: F.display, fontSize: 34 }}>{bs(total)}</T>
      </View>
      <T v="chico" oro>Sumas {Math.floor(total)} pts al retirar. Cada local te entrega su parte con su propio código.</T>

      <T v="senal" tenue>Hora de retiro</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {opciones.map((o, i) => (
          <Pressable key={o.texto} onPress={() => setFranja(i)} style={{ borderWidth: 1, borderColor: franja === i ? C.tinta : C.lineaFuerte, backgroundColor: franja === i ? C.tinta : 'transparent', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 2 }}>
            <T v="chico" style={{ color: franja === i ? C.papel : C.tinta, fontVariant: ['tabular-nums'] }}>{o.texto}</T>
          </Pressable>
        ))}
      </View>
      <T v="senal" tenue>Pago</T>
      <Segmentado opciones={[{ valor: 'en_local', texto: 'En el local al retirar' }, { valor: 'qr_anticipado', texto: 'QR antes de ir' }]} valor={pago} onCambio={setPago} />
      {pago === 'qr_anticipado' && <T v="chico" tenue>Solo para pedidos de un local. Después de pedir, adjuntas el comprobante del pago QR.</T>}
      <Aviso texto={a.error} tipo="error" />
      <Boton titulo={`Confirmar pedido · ${bs(total)}`} onPress={() => void confirmar()} cargando={a.enviando} deshabilitado={pago === 'qr_anticipado' && porLocal.length > 1} />
    </Pantalla>
  );
}
