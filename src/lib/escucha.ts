import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { API_URL, CLAVE_TOKEN, api } from './api';
import { almacen } from './almacen';
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
      const rawUri = grabador.uri;
      if (!rawUri) throw new Error('No se grabó audio');
      
      let r: ResultadoVoz;
      if (Platform.OS === 'web') {
        const blob = await (await fetch(rawUri)).blob();
        const fd = new FormData();
        fd.append('audio', blob, 'voz.m4a');
        r = await api<ResultadoVoz>('/cliente/jarvis/voz', { formulario: fd });
      } else {
        // En Android e iOS, FileSystem.uploadAsync envía el archivo nativo directamente por multipart/form-data
        // evitando que fetch() corrompa el archivo a un Blob vacío de 14 bytes
        const { uploadAsync, FileSystemUploadType } = await import('expo-file-system/legacy');
        const token = (await almacen.leer(CLAVE_TOKEN)) ?? '';
        const uploadRes = await uploadAsync(`${API_URL}/cliente/jarvis/voz`, rawUri, {
          fieldName: 'audio',
          httpMethod: 'POST',
          uploadType: FileSystemUploadType.MULTIPART,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          mimeType: 'audio/m4a',
        });
        if (uploadRes.status >= 400) {
          throw new Error('No se pudo procesar el audio en el servidor.');
        }
        r = JSON.parse(uploadRes.body);
      }
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
