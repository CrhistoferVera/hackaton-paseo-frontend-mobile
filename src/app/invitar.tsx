import { Share } from 'react-native';
import { Boton, Cargando, Pantalla, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { useDatos } from '@/lib/datos';

/** HU-C18: código de invitación; ambos ganan puntos cuando el invitado hace su primera compra. */
export default function Invitar() {
  const { datos: yo } = useDatos<any>('/auth/yo');
  const { datos: r } = useDatos<any>('/cliente/resumen');
  if (!yo) return <Cargando />;
  const mensaje = `Únete a Paseo Points en Paseo Aranjuez con mi código ${yo.codigo_invitacion} y suma puntos en tu primera compra.`;
  return (
    <Pantalla>
      <T v="senal" tenue>Tu código</T>
      <T style={{ fontFamily: F.datoMedio, fontSize: 40, letterSpacing: 6, color: C.tinta }}>{yo.codigo_invitacion}</T>
      <T>Cuando tu invitado haga su primera compra, los dos reciben puntos{r ? '' : ''}. No cuenta solo con registrarse.</T>
      <Boton titulo="Compartir invitación" onPress={() => void Share.share({ message: mensaje })} />
    </Pantalla>
  );
}
