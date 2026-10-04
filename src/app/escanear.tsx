import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Escaner } from '@/components/escaner';
import { Aviso, Boton, Pantalla, T } from '@/components/ui';
import { api } from '@/lib/api';
import { entero } from '@/lib/datos';

/**
 * Lector único de la app. Según el prefijo del QR:
 *  PPL: puerta de un local → check-in y puntos de descubrimiento (HU-C12)
 *  PPE: entrada del Paseo → «Llegué al Paseo» (HU-X01)
 *  PPA: QR de un evento → asistencia y puntos del evento
 *  PPK: ticket de parqueo (HU-X02)
 *  Factura boliviana → puntos por factura SIAT (HU-C16)
 */
export default function Escanear() {
  const { modo } = useLocalSearchParams<{ modo?: string }>();
  const router = useRouter();
  const [estado, setEstado] = useState<{ tipo: 'info' | 'error' | 'exito'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function coordenadas() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return {};
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: p.coords.latitude, lng: p.coords.longitude };
    } catch {
      return {};
    }
  }

  async function leido(texto: string) {
    if (ocupado) return;
    setOcupado(true);
    setEstado(null);
    try {
      if (texto.startsWith('PPL:')) {
        const r = await api('/cliente/checkin', { cuerpo: { codigo: texto } });
        setEstado({ tipo: 'exito', texto: r.primeraVez ? `Descubriste ${r.local}: +${r.puntos} pts.` : `Registramos tu visita a ${r.local}.` });
      } else if (texto.startsWith('PPE:')) {
        const r = await api('/cliente/llegue', { cuerpo: { fuente: 'qr_entrada', codigo: texto } });
        setEstado({ tipo: 'exito', texto: r.puntos ? `Bienvenido al Paseo: +${r.puntos} pts por tu visita de hoy.` : 'Ya registramos tu llegada de hoy.' });
      } else if (texto.startsWith('PPA:')) {
        const r = await api('/cliente/eventos/asistir', { cuerpo: { codigo: texto } });
        setEstado({ tipo: 'exito', texto: r.yaRegistrada ? `Ya registramos tu asistencia a ${r.titulo}.` : r.puntos ? `¡Gracias por venir a ${r.titulo}! +${r.puntos} pts.` : `Registramos tu asistencia a ${r.titulo}.` });
      } else if (texto.startsWith('PPK:')) {
        router.replace(`/parqueo?ticket=${encodeURIComponent(texto)}`);
        return;
      } else if (/^https?:\/\/.*(siat|impuestos)/i.test(texto) || texto.split('|').length >= 5) {
        router.replace(`/factura?qr=${encodeURIComponent(texto)}`);
        return;
      } else {
        setEstado({ tipo: 'error', texto: 'Este código no es de Paseo Points.' });
      }
    } catch (e: any) {
      setEstado({ tipo: 'error', texto: e.message });
    } finally {
      setOcupado(false);
    }
  }

  async function llegadaPorGps() {
    setOcupado(true);
    try {
      const c = await coordenadas();
      const r = await api('/cliente/llegue', { cuerpo: { fuente: 'geocerca', ...c } });
      setEstado({ tipo: 'exito', texto: r.puntos ? `Bienvenido al Paseo: +${entero(r.puntos)} pts.` : 'Ya registramos tu llegada de hoy.' });
    } catch (e: any) {
      setEstado({ tipo: 'error', texto: e.message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Pantalla>
      <T v="titulo" style={{ fontSize: 26 }}>{modo === 'llegada' ? 'Llegué al Paseo' : 'Escanear'}</T>
      <T tenue v="chico">
        {modo === 'llegada'
          ? 'Escanea el QR de cualquier entrada o usa tu ubicación. Sumas puntos una vez por día.'
          : 'Puerta de un local, entrada del Paseo, QR de un evento, ticket de parqueo o el QR de tu factura.'}
      </T>
      <Escaner onLeido={leido} pausado={ocupado} />
      {modo === 'llegada' && <Boton titulo="Usar mi ubicación" variante="claro" onPress={() => void llegadaPorGps()} cargando={ocupado} />}
      <Aviso texto={estado?.texto} tipo={estado?.tipo} />
      {estado?.tipo === 'exito' && (
        <View>
          <Boton titulo="Volver al inicio" onPress={() => router.replace('/')} />
        </View>
      )}
    </Pantalla>
  );
}
