import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { almacen } from './almacen';
import { API_URL, api } from './api';

/**
 * La voz de Jarvis.
 *  - «natural» (por defecto): voz neuronal en español nativo (Piper es_MX) generada en el servidor del
 *    Paseo y reproducida como MP3. Suena igual en Android, iPhone y el navegador, aunque el equipo no tenga
 *    voces en español instaladas (muchas computadoras con Windows solo traen voces en inglés).
 *  - «teléfono»: el sintetizador del propio equipo, eligiendo una voz en español. Es el respaldo si no hay
 *    conexión con el servidor.
 * Para que empiece a hablar enseguida, la primera frase se pide sola y las siguientes se preparan mientras suena.
 */
export type ModoVoz = 'natural' | 'telefono';

const CLAVE = 'pp.voz';
const CLAVE_MODO = 'pp.voz.modo';
let activa = true;
let modo: ModoVoz = 'natural';
let voz: { id?: string; idioma: string } = { idioma: 'es-MX' };
let preparada: Promise<void> | null = null;
let generacion = 0;
let reproductor: AudioPlayer | null = null;
const oyentes = new Set<() => void>();

function preparar() {
  preparada ??= (async () => {
    activa = (await almacen.leer(CLAVE)) !== 'no';
    modo = ((await almacen.leer(CLAVE_MODO)) as ModoVoz) || 'natural';
    if (Platform.OS !== 'web') await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    try {
      const voces = await Speech.getAvailableVoicesAsync();
      const orden = ['es-MX', 'es-US', 'es-419', 'es-BO', 'es-AR', 'es-CO', 'es-ES'];
      const espanol = voces.filter((v) => v.language?.toLowerCase().startsWith('es'));
      // Preferir voces de mejor calidad (iOS «Enhanced», Android «network» no se usa: sin nube)
      const elegida =
        orden.map((l) => espanol.find((v) => v.language.replace('_', '-') === l && /enhanced|premium/i.test(`${v.quality}${v.name}`))).find(Boolean) ??
        orden.map((l) => espanol.find((v) => v.language.replace('_', '-') === l)).find(Boolean) ??
        espanol[0];
      if (elegida) voz = { id: elegida.identifier, idioma: elegida.language.replace('_', '-') };
    } catch {
      /* sin lista de voces: se usa el idioma por defecto */
    }
  })();
  return preparada;
}
void preparar();

/** Parte el texto en frases (uniendo las muy cortas) para empezar a hablar sin esperar todo el audio. */
function frases(texto: string) {
  const partes = texto.match(/[^.!?¿¡]*[¡¿]?[^.!?]+[.!?]+|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) ?? [texto];
  const r: string[] = [];
  for (const p of partes) {
    if (r.length && (r[r.length - 1].length < 50 || p.length < 25)) r[r.length - 1] += ` ${p}`;
    else r.push(p);
  }
  return r;
}

function pedirAudio(texto: string): Promise<string | null> {
  return api<{ url: string }>('/cliente/jarvis/hablar', { cuerpo: { texto } })
    .then((r) => `${API_URL}${r.url}`)
    .catch(() => null);
}

function reproducir(url: string, g: number): Promise<void> {
  return new Promise((listo) => {
    if (g !== generacion) return listo();
    const p = createAudioPlayer({ uri: url });
    reproductor = p;
    let terminado = false;
    const fin = () => {
      if (terminado) return;
      terminado = true;
      sub.remove();
      clearTimeout(seguro);
      try {
        p.remove();
      } catch {
        /* ya liberado */
      }
      if (reproductor === p) reproductor = null;
      listo();
    };
    const sub = p.addListener('playbackStatusUpdate', (s: any) => {
      if (s.didJustFinish || g !== generacion) fin();
    });
    // Por si el evento de fin no llega (pestaña en segundo plano)
    const seguro = setTimeout(fin, 45_000);
    p.play();
  });
}

async function hablarNatural(texto: string, g: number): Promise<boolean> {
  const partes = frases(texto);
  let siguiente: Promise<string | null> | null = pedirAudio(partes[0]);
  for (let i = 0; i < partes.length; i++) {
    const url: string | null = siguiente ? await siguiente : null;
    if (g !== generacion) return true;
    if (!url) return i > 0; // si falla la primera frase, se usa la voz del teléfono
    siguiente = i + 1 < partes.length ? pedirAudio(partes[i + 1]) : null;
    await reproducir(url, g);
  }
  return true;
}

function hablarTelefono(texto: string, alTerminar?: () => void) {
  Speech.speak(texto, { language: voz.idioma, voice: voz.id, rate: 1.0, pitch: 1.0, onDone: alTerminar, onError: () => alTerminar?.() });
}

export function hablar(texto: string, alTerminar?: () => void) {
  void preparar().then(async () => {
    if (!activa) return alTerminar?.();
    callar();
    const g = ++generacion;
    if (modo === 'natural' && (await hablarNatural(texto, g))) {
      if (g === generacion) alTerminar?.();
      return;
    }
    if (g === generacion) hablarTelefono(texto, alTerminar);
  });
}

/** Lee una lista de frases en orden (indicaciones de una ruta). */
export function hablarSecuencia(frasesLista: string[], alAvanzar?: (i: number) => void) {
  const siguiente = (i: number) => {
    if (i >= frasesLista.length) return;
    alAvanzar?.(i);
    hablar(frasesLista[i], () => siguiente(i + 1));
  };
  siguiente(0);
}

export function callar() {
  generacion++;
  if (reproductor) {
    try {
      reproductor.pause();
      reproductor.remove();
    } catch {
      /* ya liberado */
    }
    reproductor = null;
  }
  void Speech.stop();
}

export async function cambiarVoz(v: boolean) {
  activa = v;
  await almacen.guardar(CLAVE, v ? 'si' : 'no');
  if (!v) callar();
  oyentes.forEach((f) => f());
}

export async function cambiarModoVoz(m: ModoVoz) {
  modo = m;
  await almacen.guardar(CLAVE_MODO, m);
  oyentes.forEach((f) => f());
}

export function useVozActiva() {
  const [v, setV] = useState(activa);
  useEffect(() => {
    const f = () => setV(activa);
    void preparar().then(f);
    oyentes.add(f);
    return () => {
      oyentes.delete(f);
    };
  }, []);
  return [v, cambiarVoz] as const;
}

export function useModoVoz() {
  const [m, setM] = useState<ModoVoz>(modo);
  useEffect(() => {
    const f = () => setM(modo);
    void preparar().then(f);
    oyentes.add(f);
    return () => {
      oyentes.delete(f);
    };
  }, []);
  return [m, cambiarModoVoz] as const;
}
