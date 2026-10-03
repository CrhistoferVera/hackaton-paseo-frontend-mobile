import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
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
 * Jarvis escucha: el teléfono (o el navegador) graba la pregunta con expo-audio y la manda al
 * servidor del Paseo, que la transcribe con Whisper local. Funciona igual en Expo Go, en la app
 * instalada y en la web, sin servicios de voz en la nube (el error «Network» del reconocedor del
 * navegador venía de ahí). El audio no se guarda.
 */
export function useEscucha(alResponder: (r: ResultadoVoz) => void) {
  const grabador = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [estado, setEstado] = useState<EstadoEscucha>('inactivo');
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);
  const callback = useRef(alResponder);
  useEffect(() => {
    callback.current = alResponder;
  });
  useEffect(() => () => {
    if (reloj.current) clearInterval(reloj.current);
  }, []);

  const detener = useCallback(async () => {
    if (reloj.current) clearInterval(reloj.current);
    reloj.current = null;
    if (!grabador.isRecording) return;
    setEstado('procesando');
    try {
      await grabador.stop();
      const uri = grabador.uri;
      if (!uri) throw new Error('No se grabó audio');
      const fd = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(uri)).blob();
        fd.append('audio', blob, `voz.${blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'}`);
      } else {
        fd.append('audio', { uri, name: 'voz.m4a', type: 'audio/m4a' } as any);
      }
      const r = await api<ResultadoVoz>('/cliente/jarvis/voz', { formulario: fd });
      if (!r.texto) setError('No te escuché bien. Acércate al micrófono e intenta de nuevo.');
      else callback.current(r);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo enviar el audio');
    } finally {
      setEstado('inactivo');
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
  }, [grabador]);

  const iniciar = useCallback(async () => {
    setError(null);
    callar();
    try {
      const permiso = await requestRecordingPermissionsAsync();
      if (!permiso.granted) return setError('Permite el micrófono para hablar con Jarvis.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await grabador.prepareToRecordAsync();
      grabador.record();
      setEstado('grabando');
      setSegundos(0);
      const inicio = Date.now();
      reloj.current = setInterval(() => {
        const s = Math.floor((Date.now() - inicio) / 1000);
        setSegundos(s);
        if (s >= MAX_SEGUNDOS) void detener();
      }, 250);
    } catch (e: any) {
      setEstado('inactivo');
      setError(Platform.OS === 'web' ? 'El navegador no permitió usar el micrófono. Revisa el permiso del sitio.' : `No se pudo usar el micrófono: ${e.message}`);
    }
  }, [grabador, detener]);

  return { estado, escuchando: estado === 'grabando', segundos, error, iniciar, detener };
}
