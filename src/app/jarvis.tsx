import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Boton, Campo, Fila, Pantalla, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api } from '@/lib/api';
import { bs } from '@/lib/datos';
import { useEscucha } from '@/lib/escucha';
import { mostrarRuta } from '@/lib/jarvis';
import { callar, hablar, useVozActiva } from '@/lib/voz';

const SUGERENCIAS = ['¿Dónde recojo mi pedido?', '¿Qué hay cerca de mí?', 'Estoy esperando mi comida', '¿Cómo llego a Napoli?', '¿Qué puedo canjear?', 'Busca audífonos bluetooth'];

/**
 * Jarvis conversacional por voz (HU-C21, HU-Y12): el micrófono transcribe en el teléfono,
 * el texto viaja al backend y la respuesta se lee con la voz nativa. También se puede escribir.
 */
export default function Jarvis() {
  const router = useRouter();
  const [vozActiva, setVozActiva] = useVozActiva();
  const [pregunta, setPregunta] = useState('');
  const [hilo, setHilo] = useState<{ yo: string; r?: any; error?: string }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const ref = useRef<ScrollView>(null);

  async function enviar(texto: string) {
    if (!texto.trim()) return;
    setPregunta('');
    setEnviando(true);
    callar();
    const i = hilo.length;
    setHilo((h) => [...h, { yo: texto }]);
    try {
      const r = await api('/cliente/jarvis', { cuerpo: { pregunta: texto } });
      setHilo((h) => h.map((x, k) => (k === i ? { ...x, r } : x)));
      if (r.ruta) mostrarRuta(r.ruta);
      hablar(r.texto);
    } catch (e: any) {
      setHilo((h) => h.map((x, k) => (k === i ? { ...x, error: e.message } : x)));
    } finally {
      setEnviando(false);
      setTimeout(() => ref.current?.scrollToEnd(), 50);
    }
  }

  const escucha = useEscucha((t) => void enviar(t));

  return (
    <Pantalla desplazable={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T tenue v="chico" style={{ flex: 1 }}>Pregúntale por tu pedido, cómo llegar a un local o qué hay cerca.</T>
        <Pressable onPress={() => void setVozActiva(!vozActiva)} hitSlop={10}>
          <T v="senal" oro={vozActiva} tenue={!vozActiva}>{vozActiva ? 'Voz activada' : 'Voz apagada'}</T>
        </Pressable>
      </View>
      <ScrollView ref={ref} contentContainerStyle={{ gap: 14, paddingBottom: 12 }} style={{ flex: 1 }}>
        {hilo.map((m, i) => (
          <View key={i} style={{ gap: 6 }}>
            <T v="italica" style={{ alignSelf: 'flex-end' }}>{m.yo}</T>
            {m.r && (
              <View style={{ backgroundColor: C.sala, padding: 14, gap: 8 }}>
                <T oscuro>{m.r.texto}</T>
                {m.r.ruta && (
                  <Pressable onPress={() => { mostrarRuta(m.r.ruta); router.push('/ruta'); }} style={{ borderWidth: 1, borderColor: C.salaOro, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' }}>
                    <T v="senal" oro oscuro>Ver ruta · {m.r.ruta.metros} m</T>
                  </Pressable>
                )}
                {m.r.ar && (
                  <Pressable onPress={() => router.push(`/ar/${encodeURIComponent(m.r.ar.codigo)}`)} style={{ borderWidth: 1, borderColor: C.salaLinea, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' }}>
                    <T v="senal" oscuro>{m.r.ar.tipo === 'drop' ? 'Abrir caja AR' : 'Ver moneda AR'}</T>
                  </Pressable>
                )}
                {m.r.productos?.map((p: any) => <Fila key={p.id} titulo={p.nombre} detalle={p.local} valor={bs(p.precioBs)} href={`/producto/${p.id}`} />)}
              </View>
            )}
            {m.error && <T style={{ color: C.alerta }}>{m.error}</T>}
          </View>
        ))}
        {!hilo.length && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {SUGERENCIAS.map((s) => (
              <Pressable key={s} onPress={() => void enviar(s)} style={{ borderWidth: 1, borderColor: C.lineaFuerte, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 2 }}>
                <T v="chico">{s}</T>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {escucha.disponible && (
        <Pressable
          onPress={() => (escucha.escuchando ? escucha.detener() : void escucha.iniciar())}
          accessibilityRole="button"
          accessibilityLabel={escucha.escuchando ? 'Dejar de escuchar' : 'Hablar con Jarvis'}
          style={{ backgroundColor: escucha.escuchando ? C.oroBrillo : C.tinta, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 16 }}>
          <T v="senal" style={{ color: escucha.escuchando ? C.tinta : C.papel, fontFamily: F.senal }}>{escucha.escuchando ? 'Escuchando… toca para enviar' : 'Toca y habla con Jarvis'}</T>
          {escucha.parcial ? <T v="chico" style={{ color: escucha.escuchando ? C.tinta : C.salaTinta }} numberOfLines={1}>{escucha.parcial}</T> : null}
        </Pressable>
      )}
      {escucha.error && <T v="chico" style={{ color: C.alerta }}>{escucha.error}</T>}
      {!escucha.disponible && <T v="chico" tenue>El micrófono necesita la app instalada (build de desarrollo); en Expo Go escribe tu pregunta.</T>}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Campo etiqueta="O escribe" value={pregunta} onChangeText={setPregunta} onSubmitEditing={() => void enviar(pregunta)} returnKeyType="send" /></View>
        <Boton titulo="Enviar" onPress={() => void enviar(pregunta)} cargando={enviando} />
      </View>
    </Pantalla>
  );
}
