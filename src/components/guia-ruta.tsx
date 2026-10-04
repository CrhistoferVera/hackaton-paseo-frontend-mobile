import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { PlanoSvg, type DatosCapas } from '@/components/plano-svg';
import { Boton, Segmentado, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import type { RutaJarvis } from '@/lib/jarvis';
import { callar, hablar } from '@/lib/voz';

const NOMBRE_PISO: Record<string, string> = { N1: 'Nivel 1', N2: 'Nivel 2', T: 'Terrazas' };

/**
 * Guía paso a paso sobre el plano: muestra el piso del paso actual, resalta su tramo y lo lee en voz alta.
 * «Siguiente» avanza; al cambiar de piso, el plano cambia solo.
 */
export function GuiaRuta({ ruta, plano, capas, onTerminar, alLlegar }: { ruta: RutaJarvis; plano: any; capas?: DatosCapas | null; onTerminar?: () => void; alLlegar?: () => void }) {
  const tramos = useMemo(
    () => ruta.tramos?.length ? ruta.tramos : ruta.pasos.map((texto, i) => ({ texto, piso: ruta.nodos[Math.min(ruta.nodos.length - 1, i)]?.piso ?? 'N1', desde: 0, hasta: ruta.nodos.length - 1 })),
    [ruta],
  );
  const [paso, setPaso] = useState(0);
  const [pisoVista, setPisoVista] = useState<string | null>(null);
  const actual = tramos[Math.min(paso, tramos.length - 1)];
  const piso = pisoVista ?? actual.piso;
  const pisos = [...new Set(ruta.nodos.map((n) => n.piso))];
  const ultimo = paso >= tramos.length - 1;

  useEffect(() => {
    setPaso(0);
    setPisoVista(null);
  }, [ruta]);
  useEffect(() => {
    setPisoVista(null);
    hablar(actual.texto);
  }, [paso, actual.texto]);
  useEffect(() => () => callar(), []);

  const recorrido = ruta.nodos.filter((n) => n.piso === piso);
  const tramo = ruta.nodos.slice(actual.desde, actual.hasta + 1).filter((n) => n.piso === piso);
  const inicio = ruta.nodos[0];

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T v="senal" oro>Hacia {ruta.destino ?? 'tu destino'}</T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <T style={{ fontFamily: F.display, fontSize: 36 }}>{ruta.metros} m</T>
            <T tenue>{ruta.minutos ?? Math.max(1, Math.round(ruta.metros / 72))} min caminando</T>
          </View>
        </View>
        {onTerminar && (
          <Pressable onPress={onTerminar} hitSlop={10}>
            <T v="senal" tenue>Terminar</T>
          </Pressable>
        )}
      </View>

      {pisos.length > 1 && (
        <Segmentado opciones={pisos.map((p) => ({ valor: p, texto: NOMBRE_PISO[p] }))} valor={piso} onCambio={setPisoVista} />
      )}
      <View style={{ borderWidth: 1, borderColor: C.linea }}>
        <PlanoSvg plano={plano} piso={piso} recorrido={recorrido} tramo={tramo} capas={capas} aqui={inicio ? { x: inicio.x, y: inicio.y, piso: inicio.piso } : null} mostrar={{ servicios: true, promos: true, eventos: false, drops: true }} />
      </View>

      <View style={{ backgroundColor: C.sala, padding: 16, gap: 10 }}>
        <T v="senal" oscuro tenue>Paso {paso + 1} de {tramos.length} · {NOMBRE_PISO[actual.piso]}</T>
        <T oscuro style={{ fontFamily: F.textoFuerte, fontSize: 19, lineHeight: 26 }}>{actual.texto}</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setPaso((p) => Math.max(0, p - 1))} disabled={paso === 0} style={{ borderWidth: 1, borderColor: C.salaLinea, paddingVertical: 10, paddingHorizontal: 14, opacity: paso === 0 ? 0.4 : 1 }}>
            <T v="senal" oscuro>Anterior</T>
          </Pressable>
          <Pressable onPress={() => hablar(actual.texto)} style={{ borderWidth: 1, borderColor: C.salaLinea, paddingVertical: 10, paddingHorizontal: 14 }}>
            <T v="senal" oscuro>Repetir</T>
          </Pressable>
          <Pressable
            onPress={() => (ultimo ? (alLlegar ?? onTerminar)?.() : setPaso((p) => p + 1))}
            style={{ flex: 1, backgroundColor: C.salaOro, paddingVertical: 10, alignItems: 'center' }}>
            <T v="senal" style={{ color: C.tinta }}>{ultimo ? 'Llegué' : 'Siguiente'}</T>
          </Pressable>
        </View>
      </View>

      <View>
        {tramos.map((t, i) => (
          <Pressable key={i} onPress={() => setPaso(i)} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.linea }}>
            <T style={{ fontFamily: F.display, fontSize: 17, color: i === paso ? C.oro : i < paso ? C.lineaFuerte : C.grafito, width: 22 }}>{i + 1}</T>
            <T style={{ flex: 1, fontFamily: i === paso ? F.textoFuerte : F.texto, color: i < paso ? C.grafito : C.tinta }}>{t.texto}</T>
          </Pressable>
        ))}
      </View>
      {!ruta.nodos.length && <Boton titulo="Volver" onPress={onTerminar} />}
    </View>
  );
}
