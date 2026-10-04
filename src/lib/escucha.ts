import { AudioQuality, IOSOutputFormat, type RecordingOptions, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { api } from './api';
import { callar } from './voz';

export type EstadoEscucha = 'inactivo' | 'grabando' | 'procesando';

/** Lo que devuelve el backend: el texto transcrito y, si se pidió, la respuesta de Jarvis. */
export interface ResultadoVoz {
  texto: string;
  segundos: number;
  latenciaMs: number;
  respuesta: any | null;
}

const MAX_SEGUNDOS = 15;

/**
 * Voz para dictar, no música: mono, AAC en .m4a (lo graban igual Android y iPhone y el servidor lo
 * decodifica con ffmpeg). En la web se usa el formato que el navegador sepa grabar.
 */
const OPCIONES: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 96000,
  isMeteringEnabled: true,
  android: { extension: '.m4a', outputFormat: 'mpeg4', audioEncoder: 'aac', sampleRate: 44100 },
  ios: { extension: '.m4a', outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.HIGH, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
  web: { mimeType: webMime(), bitsPerSecond: 96000 },
};

function webMime() {
  if (Platform.OS !== 'web' || typeof MediaRecorder === 'undefined') return 'audio/webm';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t)) ?? 'audio/webm';
}

const MIME: Record<string, string> = { m4a: 'audio/mp4', mp4: 'audio/mp4', '3gp': 'audio/3gpp', caf: 'audio/x-caf', wav: 'audio/wav', aac: 'audio/aac', webm: 'audio/webm', ogg: 'audio/ogg' };

/**
 * Jarvis escucha: el teléfono (o el navegador) graba la pregunta con expo-audio y la manda al
 * servidor del Paseo, que la transcribe con Whisper local. Funciona igual en Expo Go, en la app
 * instalada y en la web, sin servicios de voz en la nube. El audio no se guarda.
 * Toca una vez para hablar y otra para enviar; corta solo a los 15 segundos.
 */
export function useEscucha(alResponder: (r: ResultadoVoz) => void) {
  const grabador = useAudioRecorder(OPCIONES);
  const [estado, setEstado] = useState<EstadoEscucha>('inactivo');
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Estado propio: `grabador.isRecording` no siempre se actualiza a tiempo en Android
  const grabando = useRef(false);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);
  const callback = useRef(alResponder);
  useEffect(() => {
    callback.current = alResponder;
  });
  useEffect(
    () => () => {
      if (reloj.current) clearInterval(reloj.current);
      if (grabando.current) void grabador.stop().catch(() => undefined);
    },
    [grabador],
  );

  const detener = useCallback(async () => {
    if (reloj.current) clearInterval(reloj.current);
    reloj.current = null;
    if (!grabando.current) return;
    grabando.current = false;
    setEstado('procesando');
    try {
      await grabador.stop();
      const uri = grabador.uri ?? grabador.getStatus().url;
      if (!uri) throw new Error('El teléfono no entregó la grabación. Intenta de nuevo.');
      const fd = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(uri)).blob();
        if (blob.size < 1000) throw new Error('No se grabó audio. Mantén el micrófono abierto mientras hablas.');
        fd.append('audio', blob, `voz.${blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'}`);
      } else {
        const ext = (/\.(\w+)(\?.*)?$/.exec(uri)?.[1] ?? 'm4a').toLowerCase();
        fd.append('audio', { uri, name: `voz.${ext}`, type: MIME[ext] ?? 'audio/mp4' } as any);
      }
      const r = await api<ResultadoVoz>('/cliente/jarvis/voz', { formulario: fd });
      if (!r.texto) setError('No te escuché bien. Habla un poco más fuerte o más cerca del micrófono.');
      else callback.current(r);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo enviar el audio');
    } finally {
      setEstado('inactivo');
      if (Platform.OS !== 'web') await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    }
  }, [grabador]);

  const iniciar = useCallback(async () => {
    setError(null);
    callar();
    if (Platform.OS === 'web' && typeof window !== 'undefined' && !window.isSecureContext) {
      return setError('El navegador solo permite el micrófono en https o en localhost. En el celular usa la app (Expo Go) o escribe tu pregunta.');
    }
    try {
      const permiso = await requestRecordingPermissionsAsync();
      if (!permiso.granted) {
        return setError(permiso.canAskAgain === false ? 'El micrófono está bloqueado para Paseo Points. Actívalo en Ajustes del teléfono > Apps > Expo Go (o Paseo Points) > Permisos.' : 'Permite el micrófono para hablar con Jarvis.');
      }
      if (Platform.OS !== 'web') await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await grabador.prepareToRecordAsync();
      grabador.record();
      grabando.current = true;
      setEstado('grabando');
      setSegundos(0);
      const inicio = Date.now();
      reloj.current = setInterval(() => {
        const s = Math.floor((Date.now() - inicio) / 1000);
        setSegundos(s);
        if (s >= MAX_SEGUNDOS) void detener();
      }, 250);
    } catch (e: any) {
      grabando.current = false;
      setEstado('inactivo');
      setError(Platform.OS === 'web' ? 'El navegador no permitió usar el micrófono. Revisa el permiso del sitio.' : `No se pudo usar el micrófono: ${e?.message ?? 'error desconocido'}`);
    }
  }, [grabador, detener]);

  return { estado, escuchando: estado === 'grabando', segundos, error, iniciar, detener };
}
