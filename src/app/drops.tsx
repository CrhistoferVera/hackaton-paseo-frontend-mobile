import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Aviso, Boton, Cargando, Etiqueta, Pantalla, T, Vacio } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api } from '@/lib/api';
import { bs, hora, useDatos } from '@/lib/datos';
import { useTiempoReal } from '@/lib/tiempo-real';

const NOMBRE_PISO: Record<string, string> = { N1: 'Nivel 1', N2: 'Nivel 2', T: 'Terrazas' };

/**
 * Drops (HU-X05): un producto a precio especial, por poco tiempo y con unidades limitadas. Se reclama
 * desde aquí estando dentro del Paseo; el precio queda desbloqueado en PaseoYa o se paga en el local.
 */
export default function Drops() {
  const router = useRouter();
  const { datos, recargar } = useDatos<any[]>('/cliente/drops/activos');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  useTiempoReal({ drop: () => void recargar() });

  async function coordenadas() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return {};
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: p.coords.latitude, lng: p.coords.longitude };
    } catch {
      return {};
    }
  }

  async function reclamar(d: any) {
    setOcupado(d.id);
    setAviso(null);
    try {
      const r = await api(`/cliente/drops/${d.id}/reclamar`, { cuerpo: await coordenadas() });
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAviso({ tipo: 'exito', texto: `¡Listo! ${r.producto.nombre} a ${bs(r.precioEspecial)} hasta las ${hora(r.venceEn)}. Pídelo en PaseoYa o pásalo a buscar a ${r.producto.local}.` });
      void recargar();
    } catch (e: any) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally {
      setOcupado(null);
    }
  }

  if (!datos) return <Cargando />;
  return (
    <Pantalla>
      <T v="titulo">Drops</T>
      <T tenue>Ofertas relámpago de los locales: precio especial por poco tiempo y con unidades limitadas. Se reclaman estando en el Paseo.</T>
      <Aviso texto={aviso?.texto} tipo={aviso?.tipo} />
      {!datos.length && <Vacio texto="Ahora no hay Drops abiertos. Cuando se abra uno, Jarvis te avisa." />}
      {datos.map((d) => {
        const agotado = d.quedan <= 0;
        const descuento = Math.round((1 - Number(d.precio_especial) / Number(d.precio_bs)) * 100);
        return (
          <View key={d.id} style={{ borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 12, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T style={{ flex: 1, fontFamily: F.textoFuerte }}>{d.producto}</T>
              {d.ya_reclamado ? <Etiqueta texto="Reclamado" tono="exito" /> : agotado ? <Etiqueta texto="Agotado" tono="alerta" /> : <Etiqueta texto={`−${descuento} %`} tono="oro" />}
            </View>
            <T v="chico" tenue>{d.local} · {NOMBRE_PISO[d.piso]} · Local {d.numero_local}</T>
            {!!d.mensaje && <T v="chico">{d.mensaje}</T>}
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'baseline' }}>
              <T v="dato" oro style={{ fontSize: 22 }}>{bs(d.precio_especial)}</T>
              <T v="chico" tenue style={{ textDecorationLine: 'line-through' }}>{bs(d.precio_bs)}</T>
              <T v="chico" tenue>· quedan {Math.max(0, d.quedan)} · hasta las {hora(d.fin)}</T>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {d.ya_reclamado ? (
                <Boton titulo="Pedir en PaseoYa" onPress={() => router.push(`/producto/${d.producto_id}?drop=${d.id}`)} estilo={{ flex: 1 }} />
              ) : (
                <Boton titulo="Reclamar" variante="oro" onPress={() => void reclamar(d)} cargando={ocupado === d.id} deshabilitado={agotado || !!ocupado} estilo={{ flex: 1 }} />
              )}
              <Boton titulo="Cómo llegar" variante="claro" onPress={() => router.push(`/ruta?destino=local:${d.local_id}`)} estilo={{ flex: 1 }} />
            </View>
          </View>
        );
      })}
    </Pantalla>
  );
}
