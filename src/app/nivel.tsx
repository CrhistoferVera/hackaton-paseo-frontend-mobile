import { View } from 'react-native';
import { Barra, Cargando, ChipNivel, Pantalla, T } from '@/components/ui';
import { C, COLOR_NIVEL } from '@/constants/theme';
import { entero, useDatos } from '@/lib/datos';

/** HU-C05: nivel actual, lo que falta para subir y beneficios de cada nivel. */
export default function Nivel() {
  const { datos: r } = useDatos<any>('/cliente/resumen');
  if (!r) return <Cargando />;
  const n = r.nivel;
  return (
    <Pantalla>
      <ChipNivel nivel={n.nivel} />
      <T v="titulo">{n.siguiente ? `${entero(n.faltan)} pts para ${n.siguiente}` : 'Tienes el nivel más alto'}</T>
      <Barra progreso={n.progreso} color={COLOR_NIVEL[n.nivel]} />
      <T v="chico" tenue>Ganaste {entero(n.ganados12m)} pts en los últimos 12 meses. El nivel se calcula con lo que ganas, no con tu saldo: canjear no te hace bajar.</T>
      {n.niveles.map((x: any) => (
        <View key={x.nombre} style={{ borderTopWidth: 1, borderTopColor: C.linea, paddingVertical: 14, gap: 6, opacity: x.minimo <= n.ganados12m ? 1 : 0.65 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ChipNivel nivel={x.nombre} />
            <T v="chico" tenue>desde {entero(x.minimo)} pts</T>
          </View>
          {x.beneficios.map((b: string) => <T key={b} v="chico">· {b}</T>)}
        </View>
      ))}
    </Pantalla>
  );
}
