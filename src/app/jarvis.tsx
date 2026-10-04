import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api } from '@/lib/api';
import { bs, fechaHora } from '@/lib/datos';
import { useEscucha } from '@/lib/escucha';
import { mostrarRuta } from '@/lib/jarvis';
import { callar, hablar, useVozActiva } from '@/lib/voz';

const SUGERENCIAS = ['¿Qué promociones hay ahora?', '¿Qué eventos hay hoy?', '¿Cómo va mi pedido?', '¿Dónde hay un baño?', 'Tengo hambre, ¿qué me recomiendas?', '¿Dónde gano más puntos?'];

interface Mensaje {
  id: string;
  rol: 'cliente' | 'jarvis';
  texto: string;
  r?: any;
  error?: boolean;
  porVoz?: boolean;
}

/**
 * Jarvis conversacional: recuerda la conversación (se retoma al volver), entiende seguimientos
 * («¿y cuánto tarda?», «sí, llévame») y responde con datos del Paseo en tiempo real.
 * Se puede escribir o hablar: el audio se transcribe en el servidor del Paseo con Whisper local.
 */
export default function Jarvis() {
  const router = useRouter();
  const [vozActiva, setVozActiva] = useVozActiva();
  const [pregunta, setPregunta] = useState('');
  const [hilo, setHilo] = useState<Mensaje[]>([]);
  const [pensando, setPensando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const ref = useRef<ScrollView>(null);
  const bajar = () => setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 60);

  useEffect(() => {
    api<any[]>('/cliente/jarvis/historial')
      .then((h) => setHilo(h.map((m) => ({ id: String(m.id), rol: m.rol, texto: m.texto }))))
      .catch(() => undefined)
      .finally(() => {
        setCargado(true);
        bajar();
      });
    return () => callar();
  }, []);

  function responder(r: any) {
    setHilo((h) => [...h, { id: `j${Date.now()}`, rol: 'jarvis', texto: r.texto, r }]);
    if (r.ruta) mostrarRuta(r.ruta);
    if (vozActiva) hablar(r.texto);
    bajar();
  }

  async function enviar(texto: string) {
    const t = texto.trim();
    if (!t || pensando) return;
    setPregunta('');
    callar();
    setHilo((h) => [...h, { id: `c${Date.now()}`, rol: 'cliente', texto: t }]);
    setPensando(true);
    bajar();
    try {
      responder(await api('/cliente/jarvis', { cuerpo: { pregunta: t } }));
    } catch (e: any) {
      setHilo((h) => [...h, { id: `e${Date.now()}`, rol: 'jarvis', texto: e.message, error: true }]);
    } finally {
      setPensando(false);
    }
  }

  const escucha = useEscucha((v) => {
    setHilo((h) => [...h, { id: `v${Date.now()}`, rol: 'cliente', texto: v.texto, porVoz: true }]);
    if (v.respuesta) responder(v.respuesta);
  });

  async function nueva() {
    callar();
    await api('/cliente/jarvis/reiniciar', { cuerpo: {} }).catch(() => undefined);
    setHilo([]);
  }

  const ultima = [...hilo].reverse().find((m) => m.rol === 'jarvis' && m.r);
  const chips: string[] = ultima?.r?.sugerencias?.length ? ultima.r.sugerencias : !hilo.length ? SUGERENCIAS : [];
  const ocupado = pensando || escucha.estado === 'procesando';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.papel }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.linea }}>
        <Pressable onPress={() => void setVozActiva(!vozActiva)} hitSlop={10} accessibilityRole="switch" accessibilityState={{ checked: vozActiva }}>
          <T v="senal" oro={vozActiva} tenue={!vozActiva}>{vozActiva ? '● Voz activada' : '○ Voz apagada'}</T>
        </Pressable>
        <Pressable onPress={() => void nueva()} hitSlop={10} accessibilityRole="button">
          <T v="senal" tenue>Nueva conversación</T>
        </Pressable>
      </View>

      <ScrollView ref={ref} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {cargado && !hilo.length && (
          <View style={{ gap: 6, paddingVertical: 12 }}>
            <T v="titulo" style={{ fontSize: 30 }}>Hola, soy Jarvis.</T>
            <T tenue>Pregúntame lo que quieras del Paseo: promociones, eventos, precios, cuánto tarda tu comida, dónde queda una tienda o un baño, o cuántos puntos puedes ganar. Recuerdo lo que hablamos.</T>
          </View>
        )}
        {hilo.map((m) =>
          m.rol === 'cliente' ? (
            <View key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '85%', borderWidth: 1, borderColor: C.lineaFuerte, paddingHorizontal: 14, paddingVertical: 10 }}>
              <T>{m.texto}</T>
              {m.porVoz && <T v="chico" tenue style={{ marginTop: 2 }}>por voz</T>}
            </View>
          ) : (
            <Burbuja key={m.id} m={m} onRuta={(r) => { mostrarRuta(r); router.push('/ruta'); }} onIr={(h) => router.push(h)} onPregunta={(p) => void enviar(p)} />
          ),
        )}
        {ocupado && (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <ActivityIndicator color={C.oro} />
            <T tenue v="chico">{escucha.estado === 'procesando' ? 'Escuchando lo que dijiste…' : 'Jarvis está consultando el Paseo…'}</T>
          </View>
        )}
      </ScrollView>

      {chips.length > 0 && !ocupado && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20, paddingBottom: 8 }} style={{ flexGrow: 0 }}>
          {chips.map((s) => (
            <Pressable key={s} onPress={() => void enviar(s)} style={{ borderWidth: 1, borderColor: C.lineaFuerte, paddingHorizontal: 12, paddingVertical: 8 }}>
              <T v="chico">{s}</T>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8, gap: 8, borderTopWidth: 1, borderTopColor: C.linea }}>
        {escucha.error && <T v="chico" style={{ color: C.alerta }}>{escucha.error}</T>}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable
            onPress={() => (escucha.escuchando ? void escucha.detener() : void escucha.iniciar())}
            disabled={ocupado}
            accessibilityRole="button"
            accessibilityLabel={escucha.escuchando ? 'Enviar lo que dije' : 'Hablar con Jarvis'}
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: escucha.escuchando ? C.oroBrillo : C.tinta, alignItems: 'center', justifyContent: 'center', opacity: ocupado ? 0.5 : 1 }}>
            <Microfono activo={escucha.escuchando} />
          </Pressable>
          {escucha.escuchando ? (
            <Pressable onPress={() => void escucha.detener()} style={{ flex: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: C.veladura }}>
              <T v="senal">Escuchando… {escucha.segundos}s</T>
              <T v="chico" tenue>Toca para enviar</T>
            </Pressable>
          ) : (
            <TextInput
              value={pregunta}
              onChangeText={setPregunta}
              onSubmitEditing={() => void enviar(pregunta)}
              returnKeyType="send"
              placeholder="Escribe o toca el micrófono"
              placeholderTextColor={C.lineaFuerte}
              style={{ flex: 1, minWidth: 0, minHeight: 48, borderWidth: 1, borderColor: C.lineaFuerte, paddingHorizontal: 12, fontFamily: F.texto, fontSize: 16, color: C.tinta }}
            />
          )}
          {!escucha.escuchando && (
            <Pressable onPress={() => void enviar(pregunta)} disabled={!pregunta.trim() || ocupado} style={{ minHeight: 48, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: C.tinta, opacity: !pregunta.trim() || ocupado ? 0.35 : 1 }}>
              <T v="senal" style={{ color: C.papel }}>Enviar</T>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Microfono({ activo }: { activo: boolean }) {
  const color = activo ? C.tinta : C.papel;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 12, height: 18, borderRadius: 6, borderWidth: 2, borderColor: color, backgroundColor: activo ? C.tinta : 'transparent' }} />
      <View style={{ width: 18, height: 8, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, borderWidth: 2, borderTopWidth: 0, borderColor: color, marginTop: -4 }} />
      <View style={{ width: 2, height: 4, backgroundColor: color }} />
    </View>
  );
}

function Accion({ texto, onPress, oro }: { texto: string; onPress: () => void; oro?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ borderWidth: 1, borderColor: oro ? C.salaOro : C.salaLinea, paddingVertical: 8, paddingHorizontal: 12 }}>
      <T v="senal" oro={oro} oscuro>{texto}</T>
    </Pressable>
  );
}

function Burbuja({ m, onRuta, onIr, onPregunta }: { m: Mensaje; onRuta: (r: any) => void; onIr: (h: Href) => void; onPregunta: (p: string) => void }) {
  const r = m.r;
  return (
    <View style={{ backgroundColor: m.error ? C.veladura : C.sala, padding: 14, gap: 10, maxWidth: '94%' }}>
      <T oscuro={!m.error} style={m.error ? { color: C.alerta } : undefined}>{m.texto}</T>
      {r?.productos?.length > 0 && (
        <View style={{ gap: 6 }}>
          {r.productos.map((p: any) => (
            <Pressable key={p.id} onPress={() => onIr(`/producto/${p.id}`)} style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.salaLinea, paddingTop: 6 }}>
              <View style={{ flex: 1 }}>
                <T oscuro v="chico">{p.nombre}</T>
                <T oscuro tenue v="chico">{p.local}</T>
              </View>
              <T oscuro oro v="dato">{bs(p.precioBs)}</T>
            </Pressable>
          ))}
        </View>
      )}
      {r?.eventos?.length > 0 && (
        <View style={{ gap: 6 }}>
          {r.eventos.slice(0, 4).map((e: any) => (
            <Pressable key={e.id} onPress={() => onPregunta(`Cuéntame de ${e.titulo}`)} style={{ borderTopWidth: 1, borderTopColor: C.salaLinea, paddingTop: 6 }}>
              <T oscuro v="chico">{e.titulo}</T>
              <T oscuro tenue v="chico">{e.en_curso ? 'Ahora' : fechaHora(e.inicio)} · {e.lugar}{e.puntos ? ` · +${e.puntos} pts` : ''}</T>
            </Pressable>
          ))}
        </View>
      )}
      {r?.promociones?.length > 0 && (
        <View style={{ gap: 4 }}>
          {r.promociones.slice(0, 4).map((p: any) => (
            <T key={p.id} oscuro tenue v="chico">• {p.titulo}{p.local ? ` — ${p.local}` : ''}</T>
          ))}
        </View>
      )}
      {(r?.ruta || r?.acciones?.length) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {r.ruta && <Accion oro texto={`Ver ruta · ${r.ruta.metros} m`} onPress={() => onRuta(r.ruta)} />}
          {r.acciones?.filter((a: any) => a.ruta !== '/ruta' || !r.ruta).map((a: any) => <Accion key={a.ruta} texto={a.etiqueta} onPress={() => onIr(a.ruta)} />)}
        </View>
      )}
      {r?.motor && <T oscuro tenue v="chico" style={{ fontSize: 10 }}>{r.motor === 'plantilla' ? 'datos del Paseo' : r.motor.replace('ollama:', 'IA local · ')}</T>}
    </View>
  );
}
