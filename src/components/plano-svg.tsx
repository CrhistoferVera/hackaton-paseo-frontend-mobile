import { useRef, useState } from 'react';
import { Platform, Pressable, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { C } from '@/constants/theme';

export interface CapasMapa {
  promos?: boolean;
  servicios?: boolean;
  eventos?: boolean;
  monedas?: boolean;
}

/** Datos en vivo del mapa (GET /recinto/capas). */
export interface DatosCapas {
  promociones: { id: string; local_id: string; titulo: string; tipo: string; multiplicador: number }[];
  drops: { id: string; piso: string; x: number; y: number; producto: string; cartel: string }[];
  monedas: { id: string; codigo: string; piso: string; x: number; y: number; reclamada: boolean; puntos: number }[];
  eventos: { id: string; titulo: string; piso: string | null; x: number; y: number; en_curso: boolean }[];
}

type Punto = { x: number; y: number };

/** Sigla corta de cada servicio para el plano. */
const SIGLA: Record<string, string> = {
  bano: 'WC', cajero_automatico: 'ATM', informacion: 'i', lactancia: 'L', enfermeria: '+', zona_infantil: 'N', carga_celular: 'C', casilleros: 'K',
  taxi: 'T', oracion: 'O', agua: 'A',
};
export const NOMBRE_SERVICIO: Record<string, string> = {
  bano: 'Baños', cajero_automatico: 'Cajero automático', informacion: 'Información', lactancia: 'Lactancia', enfermeria: 'Enfermería', zona_infantil: 'Zona infantil',
  carga_celular: 'Carga de celulares', casilleros: 'Casilleros', taxi: 'Taxis', oracion: 'Sala de oración', agua: 'Agua',
};

/**
 * Plano 2D de un piso: locales (atenuados si están cerrados), servicios, escaleras, ascensor y entradas,
 * más capas en vivo (promociones activas, eventos, monedas y Drops), la posición del cliente y la ruta.
 * El tramo del paso actual de la guía se dibuja más intenso.
 */
export function PlanoSvg({
  plano, piso, resaltados, seleccionado, onLocal, onServicio, onEntrada, recorrido, tramo, aqui, capas, mostrar = {}, misOfertas,
}: {
  plano: any;
  piso: string;
  resaltados?: Set<string>;
  seleccionado?: string | null;
  onLocal?: (l: any) => void;
  onServicio?: (s: any) => void;
  onEntrada?: (e: any) => void;
  recorrido?: Punto[];
  tramo?: Punto[];
  aqui?: (Punto & { piso: string }) | null;
  capas?: DatosCapas | null;
  /** ofertas personales vigentes del cliente: local → multiplicador */
  misOfertas?: Map<string, number>;
  mostrar?: CapasMapa;
}) {
  const zonas = plano.zonas.filter((z: any) => z.piso === piso);
  const locales = plano.locales.filter((l: any) => l.piso === piso && l.activo);
  const vistos = new Set<string>();
  const servicios = (plano.servicios ?? []).filter((s: any) => {
    if (s.piso !== piso || !SIGLA[s.tipo]) return false;
    const k = `${s.x}-${s.y}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  const promoDe = new Map<string, any>((capas?.promociones ?? []).map((p) => [p.local_id, p]));

  // Un solo toque para todo el plano: se busca qué hay bajo el dedo (local, servicio o entrada).
  // Así funciona igual en la web y en el celular, sin handlers por elemento del SVG.
  const [ancho, setAncho] = useState(0);
  const caja = useRef<View>(null);
  const tocar = (e: GestureResponderEvent) => {
    let lx = e.nativeEvent.locationX;
    let ly = e.nativeEvent.locationY;
    let w = ancho;
    if (Platform.OS === 'web') {
      // En la web el clic no trae locationX: se calcula con el rectángulo del plano en pantalla
      const r = (caja.current as any)?.getBoundingClientRect?.();
      const ne = e.nativeEvent as any;
      if (r) {
        lx = ne.clientX - r.left;
        ly = ne.clientY - r.top;
        w = r.width;
      }
    }
    const escala = w ? (plano.ancho + 40) / w : 1;
    const x = lx * escala - 20;
    const y = ly * escala - 20;
    const s = mostrar.servicios !== false ? servicios.find((v: any) => Math.hypot(Number(v.x) - x, Number(v.y) - y) <= 26) : null;
    if (s && onServicio) return onServicio(s);
    const l = locales.find((v: any) => Math.abs(Number(v.coord_x) - x) <= 46 && Math.abs(Number(v.coord_y) - y) <= 32);
    if (l && onLocal) return onLocal(l);
    const en = (plano.entradas ?? []).filter((v: any) => v.piso === piso).find((v: any) => Math.hypot(Math.min(v.x, 990) - x, Math.min(Math.max(v.y, 10), 590) - y) <= 50);
    if (en && onEntrada) return onEntrada(en);
  };
  const interactivo = !!(onLocal || onServicio || onEntrada);

  const dibujo = (
    <Svg viewBox={`-20 -20 ${plano.ancho + 40} ${plano.alto + 40}`} width="100%" style={{ aspectRatio: (plano.ancho + 40) / (plano.alto + 40) }}>
      <Rect x={0} y={0} width={plano.ancho} height={plano.alto} fill="#fff" stroke={C.lineaFuerte} strokeWidth={2} />
      <Rect x={0} y={250} width={plano.ancho} height={100} fill={C.veladura} />
      {zonas.map((z: any) => (
        <G key={z.id}>
          <Rect x={Number(z.x)} y={Number(z.y)} width={Number(z.ancho)} height={Number(z.alto)} fill="none" stroke={C.lineaFuerte} strokeDasharray="6 6" />
          <SvgText x={Number(z.x) + 12} y={Number(z.y) + 26} fontSize={18} fill={C.grafito}>{z.nombre.toUpperCase()}</SvgText>
        </G>
      ))}

      {/* Escalera, ascensor y entradas */}
      {(plano.verticales ?? []).filter((v: any) => v.piso === piso).map((v: any) => (
        <G key={v.tipo}>
          <Rect x={v.x - 16} y={v.y - 16} width={32} height={32} fill={C.lineaFuerte} />
          <SvgText x={v.x} y={v.y + 6} fontSize={18} textAnchor="middle" fill={C.tinta} fontWeight="bold">{v.tipo === 'escalera' ? 'E' : 'A'}</SvgText>
        </G>
      ))}
      {(plano.entradas ?? []).filter((e: any) => e.piso === piso).map((e: any) => (
        <G key={e.id}>
          <Rect x={e.x - (e.x >= 1000 ? 14 : 45)} y={e.y - (e.y >= 600 ? 14 : e.y <= 0 ? 0 : 30)} width={e.x >= 1000 ? 28 : 90} height={e.x >= 1000 ? 60 : 14} fill={C.tinta} />
          <SvgText x={Math.min(e.x, 960)} y={e.y <= 0 ? -6 : e.y >= 600 ? 616 : e.y - 40} fontSize={15} textAnchor="middle" fill={C.grafito}>{e.nombre}</SvgText>
        </G>
      ))}

      {locales.map((l: any) => {
        const sel = seleccionado === l.id;
        const res = resaltados?.has(l.id);
        const cerrado = l.abierto_ahora === false;
        const promo = mostrar.promos !== false ? promoDe.get(l.id) : null;
        const x = Number(l.coord_x);
        const y = Number(l.coord_y);
        return (
          <G key={l.id}>
            {(sel || res) && <Circle cx={x} cy={y} r={56} fill={C.oroBrillo} fillOpacity={sel ? 0.35 : 0.18} />}
            <Rect x={x - 42} y={y - 28} width={84} height={56} fill={sel ? C.tinta : cerrado ? C.veladura : '#FBFAF7'} stroke={sel ? C.oroBrillo : C.lineaFuerte} strokeWidth={sel ? 3 : 1.5} />
            <SvgText x={x} y={y - 2} fontSize={15} textAnchor="middle" fill={sel ? C.papel : cerrado ? C.grafito : C.tinta}>{l.nombre.length > 11 ? l.nombre.slice(0, 10) + '…' : l.nombre}</SvgText>
            <SvgText x={x} y={y + 18} fontSize={12} textAnchor="middle" fill={sel ? C.salaOro : C.grafito}>{cerrado ? 'cerrado' : l.numero_local}</SvgText>
            {misOfertas?.has(l.id) && (
              <G>
                <Rect x={x - 60} y={y - 42} width={52} height={22} fill={C.tinta} stroke={C.oroBrillo} strokeWidth={2} />
                <SvgText x={x - 34} y={y - 26} fontSize={12} textAnchor="middle" fill={C.oroBrillo} fontWeight="bold">{`TÚ ×${misOfertas.get(l.id)}`}</SvgText>
              </G>
            )}
            {promo && (
              <G>
                <Rect x={x + 26} y={y - 42} width={34} height={22} fill={C.oroBrillo} />
                <SvgText x={x + 43} y={y - 26} fontSize={13} textAnchor="middle" fill={C.tinta} fontWeight="bold">{promo.tipo === 'puntos_dobles' ? `×${Number(promo.multiplicador)}` : '%'}</SvgText>
              </G>
            )}
          </G>
        );
      })}

      {mostrar.servicios !== false &&
        servicios.map((s: any) => (
          <G key={s.id}>
            <Circle cx={Number(s.x)} cy={Number(s.y)} r={17} fill={C.grafito} />
            <SvgText x={Number(s.x)} y={Number(s.y) + 5} fontSize={SIGLA[s.tipo].length > 2 ? 11 : 15} textAnchor="middle" fill="#fff" fontWeight="bold">{SIGLA[s.tipo]}</SvgText>
          </G>
        ))}

      {mostrar.monedas !== false &&
        (capas?.monedas ?? []).filter((m) => m.piso === piso && !m.reclamada).map((m) => (
          <G key={m.id}>
            <Circle cx={Number(m.x) + 30} cy={Number(m.y)} r={14} fill={C.oroBrillo} stroke={C.oro} strokeWidth={3} />
            <SvgText x={Number(m.x) + 30} y={Number(m.y) + 5} fontSize={12} textAnchor="middle" fill={C.tinta} fontWeight="bold">{m.puntos}</SvgText>
          </G>
        ))}
      {mostrar.monedas !== false &&
        (capas?.drops ?? []).filter((d) => d.piso === piso).map((d) => (
          <G key={d.id}>
            <Rect x={Number(d.x) - 48} y={Number(d.y) - 14} width={28} height={28} fill={C.tinta} stroke={C.oroBrillo} strokeWidth={3} />
            <SvgText x={Number(d.x) - 34} y={Number(d.y) + 6} fontSize={15} textAnchor="middle" fill={C.oroBrillo} fontWeight="bold">D</SvgText>
          </G>
        ))}
      {mostrar.eventos !== false &&
        (capas?.eventos ?? []).filter((e) => e.piso === piso).map((e) => (
          <G key={e.id}>
            <Circle cx={Number(e.x)} cy={Number(e.y) + 40} r={15} fill={e.en_curso ? C.oroBrillo : '#fff'} stroke={C.oro} strokeWidth={3} />
            <SvgText x={Number(e.x)} y={Number(e.y) + 46} fontSize={16} textAnchor="middle" fill={C.tinta}>★</SvgText>
          </G>
        ))}

      {recorrido && recorrido.length > 0 && (
        <G>
          <Polyline points={recorrido.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={C.oroBrillo} strokeOpacity={tramo?.length ? 0.45 : 1} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
          {tramo && tramo.length > 1 && <Polyline points={tramo.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={C.oro} strokeWidth={12} strokeLinejoin="round" strokeLinecap="round" />}
          {tramo && tramo.length === 1 && <Circle cx={tramo[0].x} cy={tramo[0].y} r={18} fill="none" stroke={C.oro} strokeWidth={5} />}
          <Circle cx={recorrido[recorrido.length - 1].x} cy={recorrido[recorrido.length - 1].y} r={16} fill={C.oroBrillo} stroke={C.tinta} strokeWidth={4} />
        </G>
      )}

      {aqui && aqui.piso === piso && (
        <G>
          <Circle cx={aqui.x} cy={aqui.y} r={26} fill={C.tinta} fillOpacity={0.15} />
          <Circle cx={aqui.x} cy={aqui.y} r={13} fill={C.tinta} stroke={C.oroBrillo} strokeWidth={4} />
          <Line x1={aqui.x} y1={aqui.y - 14} x2={aqui.x} y2={aqui.y - 40} stroke={C.tinta} strokeWidth={2} />
          <Rect x={Math.min(Math.max(aqui.x, 60), plano.ancho - 60) - 52} y={aqui.y - 66} width={104} height={26} fill={C.tinta} />
          <SvgText x={Math.min(Math.max(aqui.x, 60), plano.ancho - 60)} y={aqui.y - 48} fontSize={14} textAnchor="middle" fill={C.papel} fontWeight="bold">ESTÁS AQUÍ</SvgText>
        </G>
      )}
    </Svg>
  );
  if (!interactivo) return dibujo;
  return (
    <Pressable ref={caja} onPress={tocar} onLayout={(e) => setAncho(e.nativeEvent.layout.width)} accessibilityRole="image" accessibilityLabel={`Plano del piso ${piso}`}>
      {dibujo}
    </Pressable>
  );
}
