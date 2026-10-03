import { Switch, View } from 'react-native';
import { Boton, ChipNivel, Fila, Pantalla, Seccion, Segmentado, T } from '@/components/ui';
import { entero, useDatos } from '@/lib/datos';
import { useSesion } from '@/lib/sesion';
import { hablar, useModoVoz, useVozActiva } from '@/lib/voz';
import { C } from '@/constants/theme';
import { desconectarTiempoReal } from '@/lib/tiempo-real';

export default function Perfil() {
  const { usuario, salir } = useSesion();
  const [vozActiva, setVozActiva] = useVozActiva();
  const [modoVoz, setModoVoz] = useModoVoz();
  const { datos: yo } = useDatos<any>('/auth/yo');
  const { datos: r } = useDatos<any>('/cliente/resumen');
  return (
    <Pantalla>
      <T v="senal" oro>Tu cuenta</T>
      <T v="titulo">{usuario?.nombre}</T>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {r && <ChipNivel nivel={r.nivel.nivel} />}
        <T tenue v="chico">{usuario?.celular ?? usuario?.correo} · {r ? `${entero(r.saldo)} pts` : ''}</T>
      </View>
      {yo?.intereses?.length > 0 && <T v="chico" tenue>Intereses: {yo.intereses.join(', ')}</T>}

      <Seccion titulo="Puntos">
        <Fila titulo="Movimientos" detalle="Ganancias, canjes, bonos y vencimientos" href="/movimientos" />
        <Fila titulo="Nivel y beneficios" href="/nivel" />
        <Fila titulo="Misiones" href="/misiones" />
        <Fila titulo="Escanear factura" detalle="Suma puntos con el QR de tu factura del día" href="/factura" />
        <Fila titulo="Parqueo" detalle="Paga horas de parqueo con puntos" href="/parqueo" />
      </Seccion>
      <Seccion titulo="PaseoYa">
        <Fila titulo="Mis pedidos" href="/pedidos" />
        <Fila titulo="Favoritos" href="/favoritos" />
      </Seccion>
      <Seccion titulo="Ayuda">
        <Fila titulo="Pregúntale a Jarvis" detalle="Tu pedido, cómo llegar, ofertas cerca, saldo y canjes" href="/jarvis" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.linea }}>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: 'Inter_500Medium' }}>Jarvis habla en voz alta</T>
            <T v="chico" tenue>Avisos de tu pedido, rutas y ofertas cercanas</T>
          </View>
          <Switch value={vozActiva} onValueChange={(v) => void setVozActiva(v)} trackColor={{ true: C.oroBrillo, false: C.linea }} thumbColor="#fff" />
        </View>
        {vozActiva && (
          <View style={{ gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.linea }}>
            <T style={{ fontFamily: 'Inter_500Medium' }}>Voz de Jarvis</T>
            <Segmentado opciones={[{ valor: 'natural', texto: 'Natural en español' }, { valor: 'telefono', texto: 'Del teléfono' }]} valor={modoVoz} onCambio={(m) => void setModoVoz(m)} />
            <T v="chico" tenue>{modoVoz === 'natural' ? 'Voz neuronal en español nativo generada por el servidor del Paseo, sin nube.' : 'Usa la voz en español instalada en tu equipo.'}</T>
            <Boton titulo="Probar la voz" variante="claro" onPress={() => hablar(`Hola${usuario?.nombre ? `, ${usuario.nombre.split(' ')[0]}` : ''}. Soy Jarvis, tu guía en el Paseo Aranjuez.`)} />
          </View>
        )}
        <Fila titulo="Invitar amigos" detalle={yo?.codigo_invitacion ? `Tu código: ${yo.codigo_invitacion}` : undefined} href="/invitar" />
        <Fila titulo="Avisos" href="/notificaciones" />
      </Seccion>
      <Seccion titulo="Tus datos">
        <Fila titulo="Privacidad y permisos" detalle="Ubicación, personalización y eliminar cuenta" href="/privacidad" />
      </Seccion>
      <Boton titulo="Cerrar sesión" variante="claro" onPress={() => { desconectarTiempoReal(); void salir(); }} />
    </Pantalla>
  );
}
