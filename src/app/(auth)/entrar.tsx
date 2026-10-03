import { useState } from 'react';
import { Aviso, Boton, Campo, Pantalla, Segmentado, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';

/** HU-C02: contraseña u OTP; bloqueo temporal tras 5 intentos (lo aplica el servidor). */
export default function Entrar() {
  const { iniciar } = useSesion();
  const [modo, setModo] = useState<'clave' | 'otp'>('clave');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [otpEnviado, setOtpEnviado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setError(null);
    setEnviando(true);
    try {
      if (modo === 'clave') {
        const r = await api('/auth/login', { cuerpo: { identificador: id, password } });
        if (r.usuario?.rol !== 'cliente') throw new Error('Esta app es para clientes. El personal usa el portal web.');
        await iniciar(r.token, r.usuario);
      } else if (!otpEnviado) {
        const r = await api('/auth/otp/solicitar', { cuerpo: { identificador: id } });
        setOtpEnviado(r.codigoDev ?? '');
      } else {
        const r = await api('/auth/otp/verificar', { cuerpo: { identificador: id, codigo } });
        await iniciar(r.token, r.usuario);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla>
      <T v="senal" oro>Paseo Points</T>
      <T v="titulo">Ingresa</T>
      <Segmentado opciones={[{ valor: 'clave', texto: 'Contraseña' }, { valor: 'otp', texto: 'Código por SMS' }]} valor={modo} onCambio={(m) => { setModo(m); setOtpEnviado(null); setError(null); }} />
      <Campo etiqueta="Celular o correo" value={id} onChangeText={setId} autoCapitalize="none" keyboardType="email-address" placeholder="70000001" />
      {modo === 'clave' ? (
        <Campo etiqueta="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />
      ) : otpEnviado !== null ? (
        <Campo etiqueta="Código de 6 dígitos" value={codigo} onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" ayuda={otpEnviado ? `En desarrollo el código es ${otpEnviado}.` : 'Te enviamos un SMS.'} />
      ) : null}
      <Aviso texto={error} tipo="error" />
      <Boton titulo={modo === 'otp' && otpEnviado === null ? 'Enviarme un código' : 'Ingresar'} onPress={entrar} cargando={enviando} deshabilitado={!id || (modo === 'clave' ? !password : otpEnviado !== null && codigo.length !== 6)} />
    </Pantalla>
  );
}
