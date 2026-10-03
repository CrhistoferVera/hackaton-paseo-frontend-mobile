import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Jarvis escucha con el reconocedor de voz del propio teléfono (expo-speech-recognition):
 * el audio se convierte a texto en el dispositivo y solo el texto viaja al backend.
 * El módulo nativo no existe en Expo Go; ahí el micrófono se oculta y se escribe la pregunta.
 */
type Modulo = typeof import('expo-speech-recognition');
let modulo: Modulo | null | undefined;

function cargar(): Modulo | null {
  if (modulo !== undefined) return modulo;
  try {
    // require diferido: en Expo Go el módulo nativo no está y la importación lanzaría un error
    modulo = require('expo-speech-recognition') as Modulo;
    if (!modulo.ExpoSpeechRecognitionModule?.isRecognitionAvailable?.()) modulo = null;
  } catch {
    modulo = null;
  }
  return modulo;
}

export function useEscucha(alTerminar: (texto: string) => void) {
  const [disponible] = useState(() => !!cargar());
  const [escuchando, setEscuchando] = useState(false);
  const [parcial, setParcial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const final = useRef('');
  const callback = useRef(alTerminar);
  useEffect(() => {
    callback.current = alTerminar;
  });

  useEffect(() => {
    const m = cargar();
    if (!m) return;
    const mod = m.ExpoSpeechRecognitionModule;
    const subs = [
      mod.addListener('result', (e) => {
        const texto = e.results[0]?.transcript ?? '';
        setParcial(texto);
        if (e.isFinal) final.current = texto;
      }),
      mod.addListener('end', () => {
        setEscuchando(false);
        const t = final.current.trim();
        final.current = '';
        if (t) callback.current(t);
      }),
      mod.addListener('error', (e) => {
        setEscuchando(false);
        setError(e.error === 'no-speech' ? 'No te escuché. Intenta de nuevo.' : e.error === 'not-allowed' ? 'Permite el micrófono para hablar con Jarvis.' : `No se pudo escuchar (${e.error}).`);
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const iniciar = useCallback(async () => {
    const m = cargar();
    if (!m) return;
    setError(null);
    setParcial('');
    const mod = m.ExpoSpeechRecognitionModule;
    const permiso = await mod.requestPermissionsAsync();
    if (!permiso.granted) return setError('Permite el micrófono para hablar con Jarvis.');
    mod.start({
      lang: 'es-419',
      interimResults: true,
      continuous: false,
      // En el celular, reconocimiento en el dispositivo cuando el sistema lo soporta (sin nube)
      requiresOnDeviceRecognition: Platform.OS !== 'web' && mod.supportsOnDeviceRecognition(),
      contextualStrings: ['Jarvis', 'Paseo Points', 'PaseoYa', 'Panchita', 'Napoli', 'TecnoCentro', 'salteña'],
    });
    setEscuchando(true);
  }, []);

  const detener = useCallback(() => {
    cargar()?.ExpoSpeechRecognitionModule.stop();
  }, []);

  return { disponible, escuchando, parcial, error, iniciar, detener };
}
