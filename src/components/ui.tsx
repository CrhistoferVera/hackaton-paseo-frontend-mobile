import { useRef } from 'react';
import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, COLOR_NIVEL, F } from '@/constants/theme';

type Variante = 'cifra' | 'titulo' | 'subtitulo' | 'senal' | 'texto' | 'chico' | 'dato' | 'italica';

/** Tipografía con tres roles: Bodoni para cifras y títulos, Montserrat para señalética, Inter para leer. */
export function T({ v = 'texto', style, oro, tenue, oscuro, ...p }: TextProps & { v?: Variante; oro?: boolean; tenue?: boolean; oscuro?: boolean }) {
  const color = oro ? (oscuro ? C.salaOro : C.oro) : tenue ? (oscuro ? C.salaGrafito : C.grafito) : oscuro ? C.salaTinta : C.tinta;
  return <Text {...p} style={[s[v], { color }, style]} />;
}

export function Pantalla({ children, oscuro, desplazable = true, contenido, onRefresh, refreshing = false }: { children: React.ReactNode; oscuro?: boolean; desplazable?: boolean; contenido?: ViewStyle; onRefresh?: () => void | Promise<void>; refreshing?: boolean }) {
  const inicioArrastre = useRef<number | null>(null);
  const scrollY = useRef(0);
  const fondo = { backgroundColor: oscuro ? C.sala : C.papel, flex: 1 };
  return (
    <SafeAreaView style={fondo} edges={['top']}>
      {desplazable ? (
        <ScrollView
          onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
          onTouchStart={e => { if (Platform.OS === 'web' && onRefresh && scrollY.current <= 0) inicioArrastre.current = e.nativeEvent.touches[0]?.pageY ?? null; }}
          onTouchEnd={e => {
            const inicio = inicioArrastre.current; inicioArrastre.current = null;
            const fin = e.nativeEvent.changedTouches[0]?.pageY;
            if (Platform.OS === 'web' && inicio !== null && fin !== undefined && fin - inicio >= 72 && !refreshing) void onRefresh?.();
          }}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} /> : undefined} contentContainerStyle={[{ padding: 20, paddingBottom: 48, gap: 16 }, contenido]} keyboardShouldPersistTaps="handled">
          {onRefresh && Platform.OS === 'web' && <Pressable accessibilityRole="button" disabled={refreshing} onPress={() => void onRefresh()}><T v="chico" tenue>{refreshing ? 'Actualizando…' : 'Actualizar · desliza hacia abajo'}</T></Pressable>}
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, padding: 20, gap: 16 }, contenido]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Boton({ titulo, onPress, href, variante = 'tinta', deshabilitado, cargando, derecha, estilo }: { titulo: string; onPress?: () => void; href?: Href; variante?: 'tinta' | 'claro' | 'oro' | 'alerta'; deshabilitado?: boolean; cargando?: boolean; derecha?: React.ReactNode; estilo?: ViewStyle }) {
  const fondo = variante === 'tinta' ? C.tinta : variante === 'oro' ? C.oroBrillo : variante === 'alerta' ? C.alerta : 'transparent';
  const color = variante === 'claro' ? C.tinta : variante === 'oro' ? C.tinta : C.papel;
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={href ? () => router.push(href) : onPress}
      disabled={deshabilitado || cargando}
      style={({ pressed }) => [s.boton, { backgroundColor: fondo, borderColor: variante === 'claro' ? C.tinta : fondo, opacity: deshabilitado ? 0.4 : pressed ? 0.85 : 1 }, estilo]}>
      {cargando ? <ActivityIndicator color={color} /> : <Text style={[s.botonTexto, { color }]}>{titulo}</Text>}
      {derecha}
    </Pressable>
  );
}

export function Campo({ etiqueta, ayuda, derecha, ...p }: TextInputProps & { etiqueta: string; ayuda?: string; derecha?: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <T v="senal" tenue>{etiqueta}</T>
      <View style={{ justifyContent: 'center' }}>
        <TextInput placeholderTextColor={C.lineaFuerte} {...p} style={[s.campo, derecha ? { paddingRight: 40 } : null, p.style]} />
        {derecha && <View style={{ position: 'absolute', right: 12 }}>{derecha}</View>}
      </View>
      {ayuda ? <T v="chico" tenue>{ayuda}</T> : null}
    </View>
  );
}

/** Fila de libro mayor: regla fina, texto a la izquierda, valor tabular a la derecha. */
export function Fila({ titulo, detalle, valor, valorOro, onPress, href, izquierda }: { titulo: string; detalle?: string; valor?: string; valorOro?: boolean; onPress?: () => void; href?: Href; izquierda?: React.ReactNode }) {
  const cuerpo = (
    <View style={s.fila}>
      {izquierda}
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontFamily: F.textoMedio }}>{titulo}</T>
        {detalle ? <T v="chico" tenue>{detalle}</T> : null}
      </View>
      {valor ? <T v={valorOro ? 'subtitulo' : 'texto'} oro={valorOro} style={{ fontVariant: ['tabular-nums'] }}>{valor}</T> : null}
    </View>
  );
  if (href) return <IrA href={href}>{cuerpo}</IrA>;
  if (onPress) return <Pressable onPress={onPress}>{cuerpo}</Pressable>;
  return cuerpo;
}

export function Seccion({ titulo, accion, children }: { titulo: string; accion?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4, marginTop: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="senal" tenue>{titulo}</T>
        {accion}
      </View>
      {children}
    </View>
  );
}

export function ChipNivel({ nivel, oscuro }: { nivel: string; oscuro?: boolean }) {
  const color = COLOR_NIVEL[nivel] ?? C.oroBrillo;
  return (
    <View style={[s.chip, { borderColor: color }]}>
      <View style={{ width: 6, height: 6, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
      <Text style={[s.chipTexto, { color: oscuro ? C.salaOro : color === C.oroBrillo ? C.oro : color }]}>{nivel}</Text>
    </View>
  );
}

export function Etiqueta({ texto, tono = 'tenue' }: { texto: string; tono?: 'tenue' | 'oro' | 'exito' | 'alerta' | 'llena' }) {
  const color = { tenue: C.grafito, oro: C.oro, exito: C.exito, alerta: C.alerta, llena: C.papel }[tono];
  return (
    <View style={[s.etiqueta, { borderColor: tono === 'llena' ? C.tinta : color, backgroundColor: tono === 'llena' ? C.tinta : 'transparent', borderStyle: tono === 'tenue' ? 'dashed' : 'solid' }]}>
      <Text style={[s.etiquetaTexto, { color }]}>{texto}</Text>
    </View>
  );
}

export function Barra({ progreso, color = C.tinta }: { progreso: number; color?: string }) {
  return (
    <View style={{ height: 3, backgroundColor: C.linea }}>
      <View style={{ height: 3, width: `${Math.max(0, Math.min(1, progreso)) * 100}%`, backgroundColor: color }} />
    </View>
  );
}

export function Aviso({ texto, tipo = 'info' }: { texto?: string | null; tipo?: 'info' | 'error' | 'exito' }) {
  if (!texto) return null;
  const borde = tipo === 'error' ? C.alerta : tipo === 'exito' ? C.exito : C.tinta;
  return (
    <View style={{ borderLeftWidth: 2, borderLeftColor: borde, backgroundColor: tipo === 'error' ? '#F8ECE9' : tipo === 'exito' ? '#EDF3EF' : C.veladura, padding: 12 }}>
      <T style={{ color: tipo === 'error' ? C.alerta : C.tinta }}>{texto}</T>
    </View>
  );
}

export function Segmentado<T extends string>({ opciones, valor, onCambio }: { opciones: { valor: T; texto: string }[]; valor: T; onCambio: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: C.lineaFuerte, borderRadius: 2, alignSelf: 'flex-start', flexWrap: 'wrap' }}>
      {opciones.map((o, i) => (
        <Pressable key={o.valor} onPress={() => onCambio(o.valor)} style={{ paddingVertical: 7, paddingHorizontal: 12, backgroundColor: valor === o.valor ? C.tinta : 'transparent', borderLeftWidth: i ? 1 : 0, borderLeftColor: C.lineaFuerte }}>
          <Text style={[s.senal, { color: valor === o.valor ? C.papel : C.grafito }]}>{o.texto}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Vacio({ texto }: { texto: string }) {
  return <T tenue style={{ paddingVertical: 20, borderTopWidth: 1, borderTopColor: C.linea }}>{texto}</T>;
}

export function Cargando() {
  return <ActivityIndicator color={C.oroBrillo} style={{ marginTop: 32 }} />;
}

const s = StyleSheet.create({
  cifra: { fontFamily: F.display, fontSize: 60, lineHeight: 64, letterSpacing: -1 },
  titulo: { fontFamily: F.display, fontSize: 32, lineHeight: 36 },
  subtitulo: { fontFamily: F.display, fontSize: 20, lineHeight: 24 },
  italica: { fontFamily: F.displayItalica, fontSize: 18, lineHeight: 24 },
  senal: { fontFamily: F.senal, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
  texto: { fontFamily: F.texto, fontSize: 15, lineHeight: 21 },
  chico: { fontFamily: F.texto, fontSize: 12, lineHeight: 17 },
  dato: { fontFamily: F.datoMedio, fontSize: 15 },
  boton: { minHeight: 50, paddingHorizontal: 18, borderWidth: 1, borderRadius: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  botonTexto: { fontFamily: F.senal, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  campo: { borderWidth: 1, borderColor: C.lineaFuerte, backgroundColor: '#fff', borderRadius: 2, paddingHorizontal: 12, minHeight: 46, fontFamily: F.texto, fontSize: 16, color: C.tinta },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.linea },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  chipTexto: { fontFamily: F.senalFuerte, fontSize: 9.5, letterSpacing: 1.8, textTransform: 'uppercase' },
  etiqueta: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  etiquetaTexto: { fontFamily: F.senalFuerte, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' },
});

/** Contenedor tocable que navega con el router (funciona igual en nativo y en web). */
export function IrA({ href, children, estilo }: { href: Href; children: React.ReactNode; estilo?: ViewStyle }) {
  const router = useRouter();
  return <Pressable accessibilityRole="link" onPress={() => router.push(href)} style={estilo}>{children}</Pressable>;
}
