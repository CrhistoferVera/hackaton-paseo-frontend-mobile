import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Boton, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api } from '@/lib/api';
import { bs } from '@/lib/datos';

/**
 * Experiencia AR de presencia (HU-X04, HU-X05). La cámara queda de fondo; sobre el cartel reconocido
 * aparece una moneda (o la caja del Drop) que se reclama con un toque. El reclamo verifica la
 * geocerca y permite uno por hito por día. Nota: el reconocimiento usa el QR del cartel; el rastreo
 * de imagen con MindAR queda para la versión web/AR nativa.
 */
export default function ExperienciaAR() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const router = useRouter();
  const [permiso, pedir] = useCameraPermissions();
  const [info, setInfo] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moneda, setMoneda] = useState<any | null>(null);
  const [drop, setDrop] = useState<any | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const flotar = useRef(new Animated.Value(0)).current;
  const giro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permiso?.granted && permiso?.canAskAgain !== false) void pedir();
    api('/cliente/hitos/inspeccionar', { cuerpo: { codigo } }).then(setInfo).catch((e) => setError(e.message));
    // Prueba de presencia: reconocer el cartel ubica al cliente en el grafo del edificio
    api('/cliente/posicion', { cuerpo: { codigo } }).catch(() => undefined);
    Animated.loop(Animated.sequence([
      Animated.timing(flotar, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(flotar, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.timing(giro, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })).start();
  }, [codigo]);

  async function coords() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return {};
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: p.coords.latitude, lng: p.coords.longitude };
    } catch {
      return {};
    }
  }

  async function reclamarMoneda() {
    setOcupado(true);
    setError(null);
    try {
      const r = await api('/cliente/hitos/reclamar', { cuerpo: { codigo, ...(await coords()) } });
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMoneda(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }

  async function abrirDrop() {
    setOcupado(true);
    setError(null);
    try {
      const r = await api('/cliente/drops/reclamar', { cuerpo: { codigo, ...(await coords()) } });
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDrop(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }

  const y = flotar.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const escalaX = giro.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.15, 1, 0.15, 1] });
  const hayDrop = info?.drop && !info.drop.ya_reclamado && !drop;
  const hayMoneda = info?.monedaDisponible && !moneda;

  return (
    <View style={{ flex: 1, backgroundColor: C.sala }}>
      {permiso?.granted && <CameraView style={StyleSheet.absoluteFill} facing="back" />}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12,11,9,0.35)' }]} />
      <SafeAreaView style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <T v="senal" oro oscuro>Hito · {info?.hito?.piso ?? ''}</T>
            <T oscuro v="subtitulo">{info?.hito?.nombre ?? 'Reconociendo el cartel…'}</T>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={12}><T v="senal" oscuro tenue>Cerrar</T></Pressable>
        </View>

        <View style={{ alignItems: 'center' }}>
          {(hayDrop || hayMoneda) && (
            <Pressable onPress={() => void (hayDrop ? abrirDrop() : reclamarMoneda())} disabled={ocupado}>
              <Animated.View style={{ transform: [{ translateY: y }, ...(hayDrop ? [] : [{ scaleX: escalaX }])] }}>
                {hayDrop ? <Caja /> : <Moneda puntos={info.hito.puntos} />}
              </Animated.View>
            </Pressable>
          )}
          {(hayDrop || hayMoneda) && <T oscuro tenue v="chico" style={{ marginTop: 12 }}>{ocupado ? 'Verificando tu ubicación…' : hayDrop ? 'Toca la caja para abrirla' : 'Toca la moneda para reclamarla'}</T>}
        </View>

        <View style={{ gap: 12 }}>
          {moneda && (
            <View style={{ backgroundColor: 'rgba(20,18,16,0.94)', borderWidth: 1, borderColor: C.salaLinea, borderRadius: 12, padding: 16, gap: 6 }}>
              <T oscuro oro style={{ fontFamily: F.display, fontSize: 34 }}>+{moneda.puntos} pts</T>
              {moneda.ficha && (
                <>
                  <T v="senal" oscuro tenue>Cerca de ti</T>
                  <T oscuro>{moneda.ficha.nombre} · {moneda.ficha.piso} · Local {moneda.ficha.numero_local}</T>
                  {moneda.ficha.promocion && <T oscuro oro v="chico">{moneda.ficha.promocion}</T>}
                </>
              )}
            </View>
          )}
          {drop && (
            <View style={{ backgroundColor: 'rgba(20,18,16,0.94)', borderWidth: 1, borderColor: C.salaLinea, borderRadius: 12, padding: 16, gap: 8 }}>
              <T v="senal" oro oscuro>Drop desbloqueado</T>
              <T oscuro v="subtitulo">{drop.producto.nombre}</T>
              <T oscuro><T oscuro tenue style={{ textDecorationLine: 'line-through' }}>{bs(drop.producto.precioBs)}</T>  <T oscuro oro style={{ fontFamily: F.display, fontSize: 24 }}>{bs(drop.precioEspecial)}</T></T>
              <T oscuro tenue v="chico">{drop.producto.local} · solo por tiempo limitado en PaseoYa</T>
              <Boton titulo="Pedir con este precio" variante="oro" onPress={() => router.replace(`/producto/${drop.producto.id}?drop=${drop.dropId}`)} />
            </View>
          )}
          {info && !hayDrop && !hayMoneda && !moneda && !drop && <T oscuro tenue style={{ textAlign: 'center' }}>Ya reclamaste la moneda de este hito hoy. Vuelve mañana.</T>}
          {error && <T style={{ color: '#E0645A', textAlign: 'center' }}>{error}</T>}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Moneda({ puntos }: { puntos: number }) {
  return (
    <Svg width={160} height={160} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="m" cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#F3DC9A" />
          <Stop offset="0.6" stopColor="#C99A3A" />
          <Stop offset="1" stopColor="#8E6A1E" />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={80} r={70} fill="url(#m)" />
      <Circle cx={80} cy={80} r={58} fill="none" stroke="#8E6A1E" strokeWidth={2} />
      <SvgText x={80} y={78} textAnchor="middle" fontSize={36} fill="#16140F" fontWeight="600">{puntos}</SvgText>
      <SvgText x={80} y={102} textAnchor="middle" fontSize={12} fill="#16140F" letterSpacing={2}>PTS</SvgText>
    </Svg>
  );
}

function Caja() {
  return (
    <Svg width={170} height={160} viewBox="0 0 170 160">
      <Rect x={25} y={60} width={120} height={85} fill="#16140F" stroke="#D4AE5C" strokeWidth={2} />
      <Rect x={18} y={42} width={134} height={26} fill="#211E19" stroke="#D4AE5C" strokeWidth={2} />
      <Rect x={78} y={42} width={14} height={103} fill="#D4AE5C" />
      <SvgText x={85} y={115} textAnchor="middle" fontSize={13} fill="#EDE6D8" letterSpacing={3}>DROP</SvgText>
    </Svg>
  );
}
