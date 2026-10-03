import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipNivel, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { useDatos } from '@/lib/datos';
import { obtenerPase, useSesion } from '@/lib/sesion';
import { useTiempoReal } from '@/lib/tiempo-real';
import { segundosRestantes, totp } from '@/lib/totp';

/** HU-C03: pase con QR que se regenera cada 60 s y código de 6 dígitos alternativo. Funciona sin conexión. */
export default function Pase() {
  const router = useRouter();
  const { usuario } = useSesion();
  const { datos: r } = useDatos<any>('/cliente/resumen');
  const [pase, setPase] = useState<{ codigoCliente: string; secreto: string } | null>(null);
  const [ahora, setAhora] = useState(Date.now());
  const [acreditado, setAcreditado] = useState<any | null>(null);

  useEffect(() => {
    void obtenerPase().then(setPase);
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useTiempoReal({ compra: (c: any) => setAcreditado(c) });

  const codigo = pase ? totp(pase.secreto, ahora) : '------';
  const restantes = segundosRestantes();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.sala }}>
      <View style={{ flex: 1, padding: 24, gap: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T oscuro tenue>Pase de cliente</T>
          <Pressable onPress={() => router.back()} hitSlop={12}><T v="senal" oscuro tenue>Cerrar</T></Pressable>
        </View>
        <View style={{ gap: 6 }}>
          <T v="senal" oro oscuro>Paseo Points</T>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T oscuro v="titulo" style={{ fontSize: 28 }}>{usuario?.nombre}</T>
            {r && <ChipNivel nivel={r.nivel.nivel} oscuro />}
          </View>
        </View>

        {acreditado ? (
          <View style={{ backgroundColor: '#fff', padding: 24, alignItems: 'center', gap: 8 }}>
            <T v="senal" oro>Compra en {acreditado.local}</T>
            <T style={{ fontFamily: F.display, fontSize: 56, color: C.oro }}>+{acreditado.puntos}</T>
            <T tenue>{acreditado.detalle?.join(' · ') || 'puntos acreditados'}</T>
            <Pressable onPress={() => setAcreditado(null)}><T v="senal" tenue>Mostrar el pase otra vez</T></Pressable>
          </View>
        ) : (
          <View style={{ backgroundColor: '#fff', padding: 16, alignItems: 'center' }}>
            {pase ? <QRCode value={`PP1:${pase.codigoCliente}:${codigo}`} size={260} color={C.tinta} backgroundColor="#fff" ecl="M" /> : <View style={{ width: 260, height: 260 }} />}
          </View>
        )}

        <View style={{ height: 2, backgroundColor: C.salaLinea }}>
          <View style={{ height: 2, width: `${(restantes / 60) * 100}%`, backgroundColor: C.salaOro }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T v="chico" oscuro tenue>Firmado · rota cada 60 s</T>
          <T v="chico" oscuro tenue style={{ fontVariant: ['tabular-nums'] }}>Se renueva en {restantes} s</T>
        </View>
        <T oscuro style={{ fontFamily: F.datoMedio, fontSize: 34, letterSpacing: 6, textAlign: 'center' }}>{codigo.slice(0, 3)} {codigo.slice(3)}</T>
        <T v="chico" oscuro tenue style={{ textAlign: 'center' }}>Si la cámara no lee el código, díctale al cajero los últimos 4 dígitos de tu celular y estos 6 dígitos.</T>
      </View>
    </SafeAreaView>
  );
}
