import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Cargando, Etiqueta, Pantalla, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { entero, fechaHora, ubicacion, useDatos } from '@/lib/datos';
import { useTiempoReal } from '@/lib/tiempo-real';

/** HU-C08: cupón con QR de un solo uso, válido 15 minutos. */
export default function Cupon() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { datos, recargar } = useDatos<any[]>('/cliente/canjes');
  const [ahora, setAhora] = useState(Date.now());
  useTiempoReal({ canje: () => void recargar() });
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const c = datos?.find((x) => x.id === id);
  if (!c) return <Cargando />;
  const restante = Math.max(0, new Date(c.expira_en).getTime() - ahora);
  const vencido = c.estado === 'vencido' || (c.estado === 'emitido' && restante === 0);
  const mm = String(Math.floor(restante / 60000)).padStart(2, '0');
  const ss = String(Math.floor((restante % 60000) / 1000)).padStart(2, '0');

  return (
    <Pantalla contenido={{ backgroundColor: C.veladura, flexGrow: 1 }}>
      <View style={{ backgroundColor: C.papel, borderWidth: 1, borderColor: C.linea }}>
        <View style={{ padding: 20, gap: 6, borderBottomWidth: 1, borderBottomColor: C.lineaFuerte, borderStyle: 'dashed' }}>
          <T v="senal" tenue>Recompensa</T>
          <T v="titulo" style={{ fontSize: 28 }}>{c.recompensa}</T>
          <T v="chico" tenue>{c.local ? `${c.local} · ${ubicacion(c)}` : 'Cualquier local del Paseo'}</T>
          <T oro style={{ fontFamily: F.display, fontSize: 32, marginTop: 8 }}>{entero(c.costo_puntos)} <T v="senal" oro>pts</T></T>
        </View>
        <View style={{ padding: 20, flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <View style={{ opacity: c.estado === 'emitido' && !vencido ? 1 : 0.15 }}>
            <QRCode value={c.qr} size={130} color={C.tinta} backgroundColor={C.papel} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            {c.estado === 'validado' ? (
              <><Etiqueta texto="Usado" tono="llena" /><T v="chico" tenue>{fechaHora(c.validado_en)} en {c.local_validador}</T></>
            ) : vencido ? (
              <><Etiqueta texto="Vencido" tono="alerta" /><T v="chico" tenue>No se descontaron puntos.</T></>
            ) : (
              <><T style={{ fontFamily: F.datoMedio, fontSize: 30 }}>{mm}:{ss}</T><T v="chico" tenue>Válido por un solo uso. Muéstralo en el mostrador.</T></>
            )}
          </View>
        </View>
      </View>
      <T v="chico" tenue>Los {entero(c.costo_puntos)} puntos se descuentan cuando el local valide el cupón. Si vence, no pierdes nada.</T>
    </Pantalla>
  );
}
