import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { almacen } from './almacen';

/**
 * Jarvis habla con el sintetizador nativo del teléfono (iOS AVSpeechSynthesizer, Android TTS,
 * Web Speech en navegador): instantáneo, gratis y sin ancho de banda.
 */
const CLAVE = 'pp.voz';
let activa = true;
let voz: { id?: string; idioma: string } = { idioma: 'es-MX' };
let preparada = false;
const oyentes = new Set<(v: boolean) => void>();

async function preparar() {
  if (preparada) return;
  preparada = true;
  activa = (await almacen.leer(CLAVE)) !== 'no';
  try {
    const voces = await Speech.getAvailableVoicesAsync();
    const orden = ['es-MX', 'es-US', 'es-419', 'es-BO', 'es-AR', 'es-CO', 'es-ES'];
    const espanol = voces.filter((v) => v.language?.toLowerCase().startsWith('es'));
    const elegida = orden.map((l) => espanol.find((v) => v.language.replace('_', '-') === l)).find(Boolean) ?? espanol[0];
    if (elegida) voz = { id: elegida.identifier, idioma: elegida.language.replace('_', '-') };
  } catch {
    /* sin lista de voces: se usa el idioma por defecto */
  }
}
void preparar();

export function hablar(texto: string, alTerminar?: () => void) {
  void preparar().then(() => {
    if (!activa) return alTerminar?.();
    void Speech.stop();
    Speech.speak(texto, { language: voz.idioma, voice: voz.id, rate: 1.0, pitch: 1.0, onDone: alTerminar, onStopped: undefined, onError: () => alTerminar?.() });
  });
}

/** Lee una lista de frases en orden (indicaciones de una ruta). */
export function hablarSecuencia(frases: string[], alAvanzar?: (i: number) => void) {
  const siguiente = (i: number) => {
    if (i >= frases.length) return;
    alAvanzar?.(i);
    hablar(frases[i], () => siguiente(i + 1));
  };
  siguiente(0);
}

export function callar() {
  void Speech.stop();
}

export async function cambiarVoz(v: boolean) {
  activa = v;
  await almacen.guardar(CLAVE, v ? 'si' : 'no');
  if (!v) callar();
  oyentes.forEach((f) => f(v));
}

export function useVozActiva() {
  const [v, setV] = useState(activa);
  useEffect(() => {
    void preparar().then(() => setV(activa));
    oyentes.add(setV);
    return () => {
      oyentes.delete(setV);
    };
  }, []);
  return [v, cambiarVoz] as const;
}
