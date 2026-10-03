import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Aviso, Boton, Campo, Pantalla, Segmentado, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';

const INTERESES = ['Comida', 'Moda', 'Tecnología', 'Accesorios', 'Servicios', 'Regalos', 'Hogar', 'Entretenimiento'];
const ZONAS = ['Calacoto', 'Achumani', 'Obrajes', 'San Miguel', 'Irpavi', 'Sopocachi', 'Miraflores', 'Cota Cota', 'Centro', 'El Alto', 'Otra'];

/** HU-C01: registro en una pantalla, consentimiento separado de los términos, bono al terminar. */
export default function Registro() {
  const { iniciar } = useSesion();
  const [f, setF] = useState({ nombre: '', celular: '', password: '', nacimiento: '', zona: '', genero: '' });
  const [intereses, setIntereses] = useState<string[]>([]);
  const [terminos, setTerminos] = useState(false);
  const [ubicacion, setUbicacion] = useState(true);
  const [personalizacion, setPersonalizacion] = useState(true);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const alternar = (i: string) => setIntereses((xs) => (xs.includes(i) ? xs.filter((x) => x !== i) : xs.length < 3 ? [...xs, i] : xs));
  const nacimientoIso = () => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(f.nacimiento);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  };

  async function enviar() {
    setError(null);
    if (!nacimientoIso()) return setError('Escribe tu fecha de nacimiento como DD/MM/AAAA');
    if (intereses.length !== 3) return setError('Elige 3 intereses');
    setEnviando(true);
    try {
      const r = await api('/auth/registro', {
        cuerpo: {
          nombre: f.nombre.trim(), celular: f.celular, password: f.password, fechaNacimiento: nacimientoIso(), zonaResidencia: f.zona,
          intereses, genero: f.genero || undefined, aceptaTerminos: terminos, consentUbicacion: ubicacion, consentPersonalizacion: personalizacion,
          codigoInvitacion: codigo.trim() || undefined,
        },
      });
      await iniciar(r.token, { ...r.usuario });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const listo = f.nombre.length > 1 && /^\d{8}$/.test(f.celular) && f.password.length >= 6 && f.zona && terminos;

  return (
    <Pantalla>
      <T v="senal" oro>Paseo Points</T>
      <T v="titulo">Crea tu cuenta</T>
      <Campo etiqueta="Nombre y apellido" value={f.nombre} onChangeText={(v) => setF({ ...f, nombre: v })} autoComplete="name" />
      <Campo etiqueta="Celular" value={f.celular} onChangeText={(v) => setF({ ...f, celular: v.replace(/\D/g, '').slice(0, 8) })} keyboardType="number-pad" placeholder="7xxxxxxx" />
      <Campo etiqueta="Contraseña" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry ayuda="Mínimo 6 caracteres" />
      <Campo etiqueta="Fecha de nacimiento" value={f.nacimiento} onChangeText={(v) => setF({ ...f, nacimiento: v })} placeholder="DD/MM/AAAA" keyboardType="numbers-and-punctuation" />
      <View style={{ gap: 6 }}>
        <T v="senal" tenue>Zona donde vives</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {ZONAS.map((z) => (
            <Pressable key={z} onPress={() => setF({ ...f, zona: z })} style={{ borderWidth: 1, borderColor: f.zona === z ? C.tinta : C.lineaFuerte, backgroundColor: f.zona === z ? C.tinta : 'transparent', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2 }}>
              <T v="chico" style={{ color: f.zona === z ? C.papel : C.tinta }}>{z}</T>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <T v="senal" tenue>Tus 3 intereses · {intereses.length}/3</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {INTERESES.map((i) => (
            <Pressable key={i} onPress={() => alternar(i)} style={{ borderWidth: 1, borderColor: intereses.includes(i) ? C.oroBrillo : C.lineaFuerte, backgroundColor: intereses.includes(i) ? '#F6EFDD' : 'transparent', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2 }}>
              <T v="chico">{i}</T>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <T v="senal" tenue>Género (opcional)</T>
        <Segmentado opciones={[{ valor: '', texto: 'Prefiero no decir' }, { valor: 'F', texto: 'Mujer' }, { valor: 'M', texto: 'Hombre' }]} valor={f.genero} onCambio={(g) => setF({ ...f, genero: g })} />
      </View>
      <Campo etiqueta="Código de invitación (opcional)" value={codigo} onChangeText={setCodigo} autoCapitalize="characters" />

      <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 16 }}>
        <T v="senal" tenue>Tus datos, tu decisión</T>
        <Interruptor valor={ubicacion} onCambio={setUbicacion} titulo="Usar mi ubicación dentro del Paseo" detalle="Para avisarte de puntos dobles cerca y registrar tus visitas." />
        <Interruptor valor={personalizacion} onCambio={setPersonalizacion} titulo="Personalizar mis promociones y misiones" detalle="Usamos tus compras para sugerirte lugares que te pueden gustar." />
        <Interruptor valor={terminos} onCambio={setTerminos} titulo="Acepto los términos de uso" detalle="Obligatorio. Puedes cambiar los permisos de arriba o borrar tu cuenta cuando quieras." />
      </View>
      <Aviso texto={error} tipo="error" />
      <Boton titulo="Crear cuenta y recibir 100 pts" onPress={enviar} deshabilitado={!listo} cargando={enviando} />
    </Pantalla>
  );
}

function Interruptor({ valor, onCambio, titulo, detalle }: { valor: boolean; onCambio: (v: boolean) => void; titulo: string; detalle: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: 'Inter_500Medium' }}>{titulo}</T>
        <T v="chico" tenue>{detalle}</T>
      </View>
      <Switch value={valor} onValueChange={onCambio} trackColor={{ true: C.oroBrillo, false: C.linea }} thumbColor="#fff" />
    </View>
  );
}
