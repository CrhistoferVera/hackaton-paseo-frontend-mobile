import { View } from 'react-native';
import { Barra, Cargando, Etiqueta, Pantalla, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { fecha, useDatos } from '@/lib/datos';
import { useTiempoReal } from '@/lib/tiempo-real';

/** HU-C13: misiones con progreso; la personal la orquesta la IA según lo que te gusta. La recompensa se acredita sola. */
export default function Misiones() {
  const { datos, recargar } = useDatos<any[]>('/cliente/misiones');
  useTiempoReal({ notificacion: () => void recargar() });
  if (!datos) return <Cargando />;
  return (
    <Pantalla>
      <T tenue v="chico">Las misiones se cumplen solas al comprar o visitar. Cuando completas una, los puntos aparecen en tu saldo.</T>
      {datos.map((m) => (
        <View key={m.id} style={{ borderTopWidth: 1, borderTopColor: C.linea, paddingVertical: 14, gap: 8, opacity: m.completada ? 0.6 : 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
              {m.personal && <Etiqueta texto="Para ti" tono="oro" />}
              <T style={{ fontFamily: 'Inter_600SemiBold' }}>{m.nombre}</T>
            </View>
            <T v="subtitulo" oro>+{m.recompensa}</T>
          </View>
          <T v="chico" tenue>{m.descripcion}</T>
          <Barra progreso={m.avance / m.meta} color={m.completada ? C.exito : C.tinta} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="chico" tenue>{m.completada ? 'Cumplida' : `${m.avance} de ${m.meta}`}</T>
            <T v="chico" tenue>vence {fecha(m.vigenteHasta)}</T>
          </View>
        </View>
      ))}
    </Pantalla>
  );
}
