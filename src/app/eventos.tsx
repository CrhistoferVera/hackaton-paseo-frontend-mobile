import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Cargando, Etiqueta, Pantalla, T, Vacio } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { bs, hora, useDatos } from '@/lib/datos';
import { useTiempoReal } from '@/lib/tiempo-real';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const NOMBRE_PISO: Record<string, string> = { N1: 'Nivel 1', N2: 'Nivel 2', T: 'Terrazas' };

/** Día boliviano (UTC-4) de un instante, como clave y como título. */
function dia(iso: string) {
  const d = new Date(new Date(iso).getTime() - 4 * 3600_000);
  const hoy = new Date(Date.now() - 4 * 3600_000);
  const clave = d.toISOString().slice(0, 10);
  const dif = Math.round((Date.parse(clave) - Date.parse(hoy.toISOString().slice(0, 10))) / 86400_000);
  const titulo = dif === 0 ? 'Hoy' : dif === 1 ? 'Mañana' : `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
  return { clave, titulo };
}

/** Agenda de eventos del Paseo (conciertos, ferias, talleres…) con puntos por asistir y cómo llegar. */
export default function Eventos() {
  const router = useRouter();
  const { datos, cargando, recargar } = useDatos<any[]>('/cliente/eventos');
  useTiempoReal({ catalogo: recargar, connect: recargar });
  if (!datos) return <Cargando />;
  if (!datos.length) return <Pantalla onRefresh={recargar} refreshing={cargando}><Vacio texto="No hay eventos programados por ahora." /></Pantalla>;

  const grupos: { titulo: string; eventos: any[] }[] = [];
  for (const e of datos) {
    const d = e.en_curso ? { clave: 'ahora', titulo: 'Ahora' } : dia(e.inicio);
    const g = grupos.find((x) => x.titulo === d.titulo);
    if (g) g.eventos.push(e);
    else grupos.push({ titulo: d.titulo, eventos: [e] });
  }

  return (
    <Pantalla onRefresh={recargar} refreshing={cargando}>
      <T v="titulo">Agenda del Paseo</T>
      <T tenue>Asistir a los eventos con puntos te los suma al escanear el QR del lugar.</T>
      {grupos.map((g) => (
        <View key={g.titulo} style={{ gap: 8 }}>
          <T v="senal" oro>{g.titulo}</T>
          {g.eventos.map((e) => (
            <View key={e.id} style={{ borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 10, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <T style={{ flex: 1, fontFamily: F.textoFuerte }}>{e.titulo}</T>
                {e.en_curso ? <Etiqueta texto="En vivo" tono="oro" /> : <T v="dato">{hora(e.inicio)}</T>}
              </View>
              <T v="chico" tenue>
                {hora(e.inicio)}–{hora(e.fin)} · {e.lugar}{e.piso ? ` · ${NOMBRE_PISO[e.piso]}` : ''} · {e.precio_bs != null && Number(e.precio_bs) > 0 ? bs(e.precio_bs) : 'Gratis'}
                {e.cupos ? ` · ${e.cupos} cupos` : ''}
              </T>
              {!!e.descripcion && <T v="chico">{e.descripcion}</T>}
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                {e.puntos > 0 && <T v="senal" oro>+{e.puntos} pts</T>}
                {e.local_id && (
                  <Pressable onPress={() => router.push(`/ruta?destino=local:${e.local_id}`)} hitSlop={8}>
                    <T v="senal">Cómo llegar</T>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}
    </Pantalla>
  );
}
