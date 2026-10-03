import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { PlanoSvg } from '@/components/plano-svg';
import { Boton, Cargando, Pantalla, T, Vacio } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { mostrarRuta, useRutaActual } from '@/lib/jarvis';
import { callar, hablar, hablarSecuencia } from '@/lib/voz';

const NOMBRE_PISO: Record<string, string> = { N1: 'Nivel 1', N2: 'Nivel 2', T: 'Terrazas' };

/**
 * Ruta paso a paso sobre el plano (alternativa sin hardware al wayfinding con flechas AR):
 * el recorrido se dibuja por piso y Jarvis lee las indicaciones en voz alta.
 */
export default function Ruta() {
  const { destino } = useLocalSearchParams<{ destino?: string }>();
  const ruta = useRutaActual();
  const { datos: plano } = useDatos<any>('/recinto/plano');
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!destino) return;
    api(`/cliente/ruta?destino=${encodeURIComponent(destino)}`)
      .then((r) => (r ? mostrarRuta(r) : setError('No encontramos un camino hasta ese lugar.')))
      .catch((e) => setError(e.message));
  }, [destino]);
  useEffect(() => () => callar(), []);

  if (error) return <Pantalla><Vacio texto={error} /></Pantalla>;
  if (!ruta || !plano) return <Cargando />;
  const pisos = [...new Set(ruta.nodos.map((n) => n.piso))];

  return (
    <Pantalla>
      <T v="senal" oro>Hacia {ruta.destino ?? 'tu destino'}</T>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <T style={{ fontFamily: F.display, fontSize: 44 }}>{ruta.metros} m</T>
        <T tenue>unos {ruta.minutos ?? Math.max(1, Math.round(ruta.metros / 72))} min caminando</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Boton titulo="Escuchar indicaciones" onPress={() => hablarSecuencia(ruta.pasos, setPaso)} estilo={{ flex: 1 }} />
        <Boton titulo="Callar" variante="claro" onPress={callar} />
      </View>

      {ruta.pasos.map((p, i) => (
        <Pressable key={i} onPress={() => { setPaso(i); hablar(p); }} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.linea }}>
          <T style={{ fontFamily: F.display, fontSize: 18, color: i === paso ? C.oro : C.lineaFuerte, width: 22 }}>{i + 1}</T>
          <T style={{ flex: 1, fontFamily: i === paso ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>{p}</T>
        </Pressable>
      ))}

      {pisos.map((piso) => (
        <View key={piso} style={{ gap: 6 }}>
          <T v="senal" tenue>{NOMBRE_PISO[piso]}</T>
          <PlanoSvg plano={plano} piso={piso} recorrido={ruta.nodos.filter((n) => n.piso === piso)} />
        </View>
      ))}
    </Pantalla>
  );
}
