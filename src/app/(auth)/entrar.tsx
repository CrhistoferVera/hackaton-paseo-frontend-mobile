import { useState } from 'react';
import { Pressable } from 'react-native';
import { Aviso, Boton, Campo, Pantalla, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { SymbolView } from 'expo-symbols';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';

/** HU-C02: contraseña; bloqueo temporal tras 5 intentos (lo aplica el servidor). */
export default function Entrar() {
  const { iniciar } = useSesion();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setError(null);
    setEnviando(true);
    try {
      const r = await api('/auth/login', { cuerpo: { identificador: id, password } });
      if (r.usuario?.rol !== 'cliente') throw new Error('Esta app es para clientes. El personal usa el portal web.');
      await iniciar(r.token, r.usuario);
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
      <Campo etiqueta="Celular o correo" value={id} onChangeText={setId} autoCapitalize="none" keyboardType="email-address" placeholder="70000001" />
      <Campo 
        etiqueta="Contraseña" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry={!verPassword} 
        derecha={
          <Pressable onPress={() => setVerPassword(!verPassword)} hitSlop={10}>
            <SymbolView name={verPassword ? 'eye.slash' : 'eye'} size={24} tintColor={C.tinta} />
          </Pressable>
        } 
      />
      <Aviso texto={error} tipo="error" />
      <Boton titulo="Ingresar" onPress={entrar} cargando={enviando} deshabilitado={!id || !password} />
    </Pantalla>
  );
}
