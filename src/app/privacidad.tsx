import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Aviso, Boton, Cargando, Pantalla, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { api } from '@/lib/api';
import { fecha, useDatos } from '@/lib/datos';
import { useSesion } from '@/lib/sesion';

/** HU-C22: ver y controlar qué datos compartes; eliminar la cuenta. */
export default function Privacidad() {
  const { salir } = useSesion();
  const { datos, setDatos } = useDatos<any>('/cliente/privacidad');
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!datos) return <Cargando />;

  async function cambiar(campo: string, valor: boolean) {
    try {
      setDatos(await api('/cliente/privacidad', { metodo: 'PUT', cuerpo: { [campo]: valor } }).then((r) => ({ ...datos, ...r })));
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Pantalla>
      <T tenue v="chico">Aceptaste los términos el {fecha(datos.consent_terminos_en)}. Estos permisos son independientes y puedes cambiarlos cuando quieras.</T>
      <Interruptor titulo="Ubicación dentro del Paseo" detalle="Avisos de puntos dobles y Drops cerca, registro de llegada y rutas dentro del Paseo." valor={datos.consent_ubicacion} onCambio={(v) => void cambiar('consentUbicacion', v)} />
      <Interruptor titulo="Personalización" detalle="Misiones y promociones según tus compras. Sin esto, ves solo las generales." valor={datos.consent_personalizacion} onCambio={(v) => void cambiar('consentPersonalizacion', v)} />
      <Interruptor titulo="Mostrar mi nombre a los locales" detalle="Si lo desactivas, los locales te ven con un alias en sus rankings." valor={datos.mostrar_nombre_locales} onCambio={(v) => void cambiar('mostrarNombreLocales', v)} />
      <T v="chico" tenue>La analítica del Paseo usa un identificador seudónimo y solo muestra grupos de 5 personas o más.</T>
      <Aviso texto={error} tipo="error" />
      <View style={{ borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 16, gap: 10 }}>
        {!confirmarBorrado ? (
          <Boton titulo="Eliminar mi cuenta" variante="claro" onPress={() => setConfirmarBorrado(true)} />
        ) : (
          <>
            <T>Se borran tu nombre, celular y perfil. Tus puntos se pierden y tus visitas quedan solo en estadísticas anónimas. No se puede deshacer.</T>
            <Boton titulo="Sí, eliminar definitivamente" variante="alerta" onPress={async () => { await api('/cliente/cuenta', { metodo: 'DELETE' }); await salir(); }} />
            <Boton titulo="Cancelar" variante="claro" onPress={() => setConfirmarBorrado(false)} />
          </>
        )}
      </View>
    </Pantalla>
  );
}

function Interruptor({ titulo, detalle, valor, onCambio }: { titulo: string; detalle: string; valor: boolean; onCambio: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.linea, paddingVertical: 12 }}>
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: 'Inter_500Medium' }}>{titulo}</T>
        <T v="chico" tenue>{detalle}</T>
      </View>
      <Switch value={valor} onValueChange={onCambio} trackColor={{ true: C.oroBrillo, false: C.linea }} thumbColor="#fff" />
    </View>
  );
}
