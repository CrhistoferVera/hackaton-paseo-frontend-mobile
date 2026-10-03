import Svg, { Circle, G, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { C } from '@/constants/theme';

/** Plano 2D de un piso con los locales; resalta el seleccionado y los resultados de la búsqueda. */
export function PlanoSvg({ plano, piso, resaltados, seleccionado, onLocal, recorrido }: { plano: any; piso: string; resaltados?: Set<string>; seleccionado?: string | null; onLocal?: (l: any) => void; recorrido?: { x: number; y: number }[] }) {
  const zonas = plano.zonas.filter((z: any) => z.piso === piso);
  const locales = plano.locales.filter((l: any) => l.piso === piso && l.activo);
  return (
    <Svg viewBox={`-10 -10 ${plano.ancho + 20} ${plano.alto + 20}`} width="100%" style={{ aspectRatio: (plano.ancho + 20) / (plano.alto + 20) }}>
      <Rect x={0} y={0} width={plano.ancho} height={plano.alto} fill="#fff" stroke={C.lineaFuerte} strokeWidth={2} />
      <Rect x={0} y={250} width={plano.ancho} height={100} fill={C.veladura} />
      {zonas.map((z: any) => (
        <G key={z.id}>
          <Rect x={Number(z.x)} y={Number(z.y)} width={Number(z.ancho)} height={Number(z.alto)} fill="none" stroke={C.lineaFuerte} strokeDasharray="6 6" />
          <SvgText x={Number(z.x) + 12} y={Number(z.y) + 26} fontSize={20} fill={C.grafito}>{z.nombre.toUpperCase()}</SvgText>
        </G>
      ))}
      {locales.map((l: any) => {
        const sel = seleccionado === l.id;
        const res = resaltados?.has(l.id);
        return (
          <G key={l.id} onPress={onLocal ? () => onLocal(l) : undefined}>
            {(sel || res) && <Circle cx={Number(l.coord_x)} cy={Number(l.coord_y)} r={56} fill={C.oroBrillo} fillOpacity={sel ? 0.35 : 0.18} />}
            <Rect x={Number(l.coord_x) - 40} y={Number(l.coord_y) - 28} width={80} height={56} fill={sel ? C.tinta : '#FBFAF7'} stroke={sel ? C.oroBrillo : C.lineaFuerte} strokeWidth={sel ? 3 : 1.5} />
            <SvgText x={Number(l.coord_x)} y={Number(l.coord_y) - 2} fontSize={15} textAnchor="middle" fill={sel ? C.papel : C.tinta}>{l.nombre.length > 11 ? l.nombre.slice(0, 10) + '…' : l.nombre}</SvgText>
            <SvgText x={Number(l.coord_x)} y={Number(l.coord_y) + 18} fontSize={13} textAnchor="middle" fill={sel ? C.salaOro : C.grafito}>{l.numero_local}</SvgText>
          </G>
        );
      })}
      {recorrido && recorrido.length > 0 && (
        <G>
          <Polyline points={recorrido.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={C.oroBrillo} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={recorrido[0].x} cy={recorrido[0].y} r={14} fill={C.tinta} />
          <Circle cx={recorrido[recorrido.length - 1].x} cy={recorrido[recorrido.length - 1].y} r={16} fill={C.oroBrillo} stroke={C.tinta} strokeWidth={4} />
        </G>
      )}
    </Svg>
  );
}
