import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Escaner } from '@/components/escaner';
import { Aviso, Boton, Campo, Pantalla, T } from '@/components/ui';
import { api } from '@/lib/api';
import { bs } from '@/lib/datos';

/**
 * HU-C16: escanear el QR de la factura (SIAT en línea o con código de control).
 * Una factura suma una sola vez, solo del mismo día y solo de locales del Paseo.
 */
export default function Factura() {
  const { qr } = useLocalSearchParams<{ qr?: string }>();
  const [contenido, setContenido] = useState(qr ?? '');
  const [monto, setMonto] = useState('');
  const hoy = new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10);
  const [resultado, setResultado] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const esUrl = /^https?:\/\//i.test(contenido);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      setResultado(await api('/cliente/facturas', { cuerpo: { contenido, ...(esUrl ? { montoBs: Number(monto.replace(',', '.')), fecha: hoy } : {}) } }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla>
      <T tenue v="chico">¿Compraste en un local que no escaneó tu pase? Escanea el QR de la factura de hoy y suma los puntos.</T>
      {!contenido ? (
        <Escaner onLeido={setContenido} />
      ) : (
        <>
          <T v="senal" tenue>Factura leída</T>
          <T v="chico" numberOfLines={3}>{contenido}</T>
          {esUrl && <Campo etiqueta="Monto total de la factura (Bs)" value={monto} onChangeText={setMonto} keyboardType="decimal-pad" ayuda="La factura en línea no trae el monto en el QR; cópialo del papel." />}
          <Boton titulo="Sumar puntos" onPress={() => void enviar()} cargando={enviando} deshabilitado={esUrl && !Number(monto.replace(',', '.'))} />
          <Boton titulo="Escanear otra" variante="claro" onPress={() => { setContenido(''); setResultado(null); }} />
        </>
      )}
      <Aviso texto={resultado ? `Sumaste ${resultado.puntos} pts por ${bs(resultado.montoBs)} en ${resultado.local}.` : null} tipo="exito" />
      <Aviso texto={error} tipo="error" />
    </Pantalla>
  );
}
