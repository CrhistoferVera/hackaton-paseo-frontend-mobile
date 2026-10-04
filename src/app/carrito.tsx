import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Aviso, Boton, Pantalla, Segmentado, T, Vacio } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api } from '@/lib/api';
import { claveItem, useCarrito, type TipoCarrito } from '@/lib/carrito';
import { bs, useAccion } from '@/lib/datos';

export default function Carrito() {
  const router = useRouter();
  const { tipo: inicial } = useLocalSearchParams<{ tipo?: string }>();
  const carritos = useCarrito();
  const [tipo, setTipo] = useState<TipoCarrito>(inicial === 'retail' ? 'retail' : 'comida');
  const { porLocal, total, cambiar, vaciar, items, cargado, error } = carritos[tipo];
  const [dia, setDia] = useState(0);
  const [pago, setPago] = useState<'en_local' | 'qr_anticipado'>('en_local');
  const a = useAccion();

  async function confirmar() {
    const fecha = new Date(Date.now() - 4 * 3600_000 + dia * 86400_000).toISOString().slice(0, 10);
    const r = await a.ejecutar(() =>
      api('/cliente/pedidos', {
        cuerpo: { items: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad, dropId: i.dropId ?? null, varianteIds: i.varianteIds ?? [] })), tipo, fechaEstimadaRetiro: tipo === 'retail' ? fecha : undefined, pago },
      }),
    );
    if (r) {
      vaciar();
      router.replace(`/pedido/${r.pedidoId}`);
    }
  }


  return (
    <Pantalla>
      <Segmentado opciones={[{valor: 'comida', texto: `Comida (${carritos.comida.cantidadTotal})`}, {valor: 'retail', texto: `Retail (${carritos.retail.cantidadTotal})`}]} valor={tipo} onCambio={setTipo} />
      <Aviso texto={error} tipo="error" />
      {!items.length && <Vacio texto={`Tu carrito de ${tipo} está vacío.`} />}
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
            <View key={claveItem(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <T style={{ flex: 1 }}>{i.nombre}{i.varianteDetalle ? ` · ${i.varianteDetalle}` : ''}{i.dropId ? ' · precio Drop' : ''}</T>
              <Pressable onPress={() => cambiar(claveItem(i), i.cantidad - 1)} hitSlop={8}><T v="subtitulo">−</T></Pressable>
              <T style={{ fontFamily: F.datoMedio, minWidth: 18, textAlign: 'center' }}>{i.cantidad}</T>
              <Pressable onPress={() => cambiar(claveItem(i), i.cantidad + 1)} hitSlop={8}><T v="subtitulo">+</T></Pressable>
            </View>
          ))}
        </View>
      ))}
      <View style={{ borderTopWidth: 2, borderTopColor: C.tinta, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T v="senal" tenue>Total</T>
        <T style={{ fontFamily: F.display, fontSize: 34 }}>{bs(total)}</T>
      </View>
      <T v="chico" oro>Sumas {Math.floor(total)} pts al retirar. Cada local te entrega su parte con su propio código.</T>

      {tipo === 'retail' ? <>
        <T v="senal" tenue>Fecha estimada de llegada</T>
        <Segmentado opciones={[{valor:'0',texto:'Hoy'},{valor:'1',texto:'Mañana'},{valor:'2',texto:'Pasado mañana'}]} valor={String(dia)} onCambio={v => setDia(Number(v))} />
      </> : <T v="chico" tenue>El restaurante recibe tu pedido ahora y te avisa cuando esté listo para recoger.</T>}
      <T v="senal" tenue>Pago</T>
      <Segmentado opciones={[{ valor: 'en_local', texto: 'En el local al retirar' }, { valor: 'qr_anticipado', texto: 'QR antes de ir' }]} valor={pago} onCambio={setPago} />
      {pago === 'qr_anticipado' && <T v="chico" tenue>Solo para pedidos de un local. Después de pedir, adjuntas el comprobante del pago QR.</T>}
      <Aviso texto={a.error} tipo="error" />
      <Boton titulo={`${tipo === 'comida' ? 'Realizar Pedido' : 'Confirmar Reserva / Pedido'} · ${bs(total)}`} onPress={() => void confirmar()} cargando={a.enviando} deshabilitado={!cargado || !items.length || (pago === 'qr_anticipado' && porLocal.length > 1)} />
    </Pantalla>
  );
}
