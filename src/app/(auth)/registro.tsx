import { useState } from 'react';
import { Pressable, Switch, View , Modal, ScrollView } from 'react-native';
import { Aviso, Boton, Campo, Pantalla, Segmentado, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';

import { SymbolView } from 'expo-symbols';


const INTERESES = ['Comida', 'Moda', 'Tecnología', 'Accesorios', 'Servicios', 'Regalos', 'Hogar', 'Entretenimiento'];
const ZONAS = ['Cercado', 'Quillacollo', 'Sacaba', 'Vinto', 'Tiquipaya', 'Colcapirhua', 'Otro'];

/** HU-C01: registro en una pantalla, consentimiento separado de los términos, bono al terminar. */
export default function Registro() {
  const { iniciar } = useSesion();
  const [f, setF] = useState({ nombre: '', celular: '', correo: '', password: '', nacimiento: '', zona: '', genero: '' });
  const [intereses, setIntereses] = useState<string[]>([]);
  const [terminos, setTerminos] = useState(false);
  const [ubicacion, setUbicacion] = useState(true);
  const [personalizacion, setPersonalizacion] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  const alternar = (i: string) => setIntereses((xs) => (xs.includes(i) ? xs.filter((x) => x !== i) : [...xs, i]));
  const nacimientoIso = () => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(f.nacimiento);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  };

  async function enviar() {
    setError(null);
    if (!nacimientoIso()) return setError('Escribe tu fecha de nacimiento como DD/MM/AAAA');
    if (intereses.length === 0) return setError('Elige al menos 1 interés');
    setEnviando(true);
    try {
      const r = await api('/auth/registro', {
        cuerpo: {
          nombre: f.nombre.trim(), celular: f.celular, correo: f.correo.trim(), password: f.password, fechaNacimiento: nacimientoIso(), zonaResidencia: f.zona,
          intereses, genero: f.genero || undefined, aceptaTerminos: terminos, consentUbicacion: ubicacion, consentPersonalizacion: personalizacion,
        },
      });
      await iniciar(r.token, { ...r.usuario });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const listo = f.nombre.length > 1 && /^\d{8}$/.test(f.celular) && f.correo.includes('@') && f.password.length >= 6 && f.zona && terminos;

  return (
    <Pantalla>
      <T v="senal" oro>Paseo Points</T>
      <T v="titulo">Crea tu cuenta</T>
      <Campo etiqueta="Nombre y apellido" value={f.nombre} onChangeText={(v) => setF({ ...f, nombre: v })} autoComplete="name" />
      <Campo etiqueta="Celular" value={f.celular} onChangeText={(v) => setF({ ...f, celular: v.replace(/\D/g, '').slice(0, 8) })} keyboardType="number-pad" placeholder="7xxxxxxx" />
      <Campo etiqueta="Correo electrónico" value={f.correo} onChangeText={(v) => setF({ ...f, correo: v })} keyboardType="email-address" autoCapitalize="none" placeholder="correo@ejemplo.com" />
      <Campo etiqueta="Contraseña" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry={!verPassword} ayuda="Mínimo 6 caracteres" derecha={<Pressable onPress={() => setVerPassword(!verPassword)} hitSlop={10}><SymbolView name={verPassword ? 'eye.slash' : 'eye'} size={24} tintColor={C.tinta} /></Pressable>} />
      
      <Pressable onPress={() => setMostrarCalendario(true)}>
        <View pointerEvents="none">
          <Campo etiqueta="Fecha de nacimiento" value={f.nacimiento} editable={false} placeholder="Toca para seleccionar" />
        </View>
      </Pressable>
      <CalendarioPuro visible={mostrarCalendario} onClose={() => setMostrarCalendario(false)} onSelect={(v: string) => setF({ ...f, nacimiento: v })} valor={f.nacimiento} />
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
        <T v="senal" tenue>Tus intereses · {intereses.length}</T>
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

function CalendarioPuro({ visible, onClose, onSelect, valor }: any) {
  const [vista, setVista] = useState<'AÑO' | 'MES' | 'DIA'>('AÑO');
  const [año, setAño] = useState(() => valor ? parseInt(valor.split('/')[2]) || 2000 : 2000);
  const [mes, setMes] = useState(() => valor ? parseInt(valor.split('/')[1]) || 1 : 1);
  
  if (!visible) return null;

  const AÑOS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const diasEnMes = new Date(año, mes, 0).getDate();
  const DIAS = Array.from({ length: diasEnMes }, (_, i) => i + 1);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          <View style={{ padding: 20, backgroundColor: C.tinta }}>
            <T style={{ color: '#fff' }} v="titulo">
              {vista === 'AÑO' ? 'Selecciona Año' : vista === 'MES' ? 'Selecciona Mes' : 'Selecciona Día'}
            </T>
            <T style={{ color: C.papel }} v="senal">{año} {vista === 'DIA' ? `- ${MESES[mes - 1]}` : ''}</T>
          </View>
          
          <ScrollView style={{ maxHeight: 300, padding: 10 }}>
            {vista === 'AÑO' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {AÑOS.map(a => (
                  <Pressable key={a} onPress={() => { setAño(a); setVista('MES'); }} style={{ padding: 12, borderWidth: 1, borderColor: C.linea, borderRadius: 4, width: '30%', alignItems: 'center' }}>
                    <T>{String(a)}</T>
                  </Pressable>
                ))}
              </View>
            )}
            {vista === 'MES' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {MESES.map((m, i) => (
                  <Pressable key={m} onPress={() => { setMes(i + 1); setVista('DIA'); }} style={{ padding: 12, borderWidth: 1, borderColor: C.linea, borderRadius: 4, width: '30%', alignItems: 'center' }}>
                    <T>{m}</T>
                  </Pressable>
                ))}
              </View>
            )}
            {vista === 'DIA' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {DIAS.map(d => (
                  <Pressable key={d} onPress={() => {
                    const f = `${d.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${año}`;
                    onSelect(f);
                    setVista('AÑO'); // Reset para la próxima vez
                    onClose();
                  }} style={{ padding: 12, borderWidth: 1, borderColor: C.linea, borderRadius: 4, width: '20%', alignItems: 'center' }}>
                    <T>{String(d)}</T>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: C.linea, flexDirection: 'row', gap: 10 }}>
             {vista !== 'AÑO' && <Boton titulo="Atrás" variante="claro" estilo={{ flex: 1 }} onPress={() => setVista(vista === 'DIA' ? 'MES' : 'AÑO')} />}
             <Boton titulo="Cancelar" variante="claro" estilo={{ flex: 1 }} onPress={() => { setVista('AÑO'); onClose(); }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
