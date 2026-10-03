import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '@/constants/theme';
import { mostrarRuta, type OrdenJarvis } from '@/lib/jarvis';
import { useTiempoReal } from '@/lib/tiempo-real';
import { callar, hablar } from '@/lib/voz';
import { T } from './ui';

/**
 * Jarvis proactivo: el backend decide qué decir según lo que haces (pediste en PaseoYa, tu comida
 * se está preparando, pasaste cerca de una oferta) y el teléfono lo dice en voz alta y lo muestra.
 */
export function JarvisEnVivo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orden, setOrden] = useState<OrdenJarvis | null>(null);
  const aparicion = useRef(new Animated.Value(0)).current;
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cerrar = () => {
    clearTimeout(temporizador.current);
    Animated.timing(aparicion, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setOrden(null));
  };

  useTiempoReal({
    orden_voz_jarvis: (o: OrdenJarvis) => {
      setOrden(o);
      if (o.ruta) mostrarRuta(o.ruta);
      hablar(o.texto);
      aparicion.setValue(0);
      Animated.timing(aparicion, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(cerrar, 20_000);
    },
  });
  useEffect(() => () => clearTimeout(temporizador.current), []);

  if (!orden) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[s.contenedor, { bottom: insets.bottom + 74, opacity: aparicion, transform: [{ translateY: aparicion.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
      <View style={s.tarjeta} accessibilityLiveRegion="polite">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T v="senal" oro oscuro>Jarvis</T>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Pressable onPress={() => hablar(orden.texto)} hitSlop={10}><T v="senal" oscuro tenue>Repetir</T></Pressable>
            <Pressable onPress={() => { callar(); cerrar(); }} hitSlop={10}><T v="senal" oscuro tenue>Cerrar</T></Pressable>
          </View>
        </View>
        <T oscuro style={{ fontSize: 16, lineHeight: 22 }}>{orden.texto}</T>
        {(orden.ruta || orden.ar || orden.acciones?.length) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {orden.ruta && <Accion texto={`Ver ruta · ${orden.ruta.metros} m`} onPress={() => { cerrar(); router.push('/ruta'); }} oro />}
            {orden.ar && <Accion texto={orden.ar.tipo === 'drop' ? 'Abrir caja AR' : 'Ver moneda AR'} onPress={() => { cerrar(); router.push(`/ar/${encodeURIComponent(orden.ar!.codigo)}`); }} />}
            {orden.acciones?.map((a) => <Accion key={a.ruta} texto={a.etiqueta} onPress={() => { cerrar(); router.push(a.ruta as any); }} />)}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function Accion({ texto, onPress, oro }: { texto: string; onPress: () => void; oro?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ borderWidth: 1, borderColor: oro ? C.salaOro : C.salaLinea, backgroundColor: oro ? C.salaOro : 'transparent', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 2 }}>
      <T v="senal" style={{ color: oro ? C.sala : C.salaTinta, fontFamily: F.senal }}>{texto}</T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  contenedor: { position: 'absolute', left: 12, right: 12, zIndex: 50 },
  tarjeta: { backgroundColor: 'rgba(12,11,9,0.96)', borderWidth: 1, borderColor: C.salaLinea, borderRadius: 12, padding: 16, gap: 8 },
});
