import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Escaner } from '@/components/escaner';
import { Aviso, Boton, Cargando, Pantalla, Segmentado, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api } from '@/lib/api';
import { bs, entero, hora, useAccion, useDatos } from '@/lib/datos';

/** HU-X02 (simulado): escanear el ticket al entrar y pagar horas con puntos al salir. Mide la permanencia. */
export default function Parqueo() {
  const { ticket } = useLocalSearchParams<{ ticket?: string }>();
  const { datos: p, recargar, cargando } = useDatos<any>('/cliente/parqueo');
  const { datos: r } = useDatos<any>('/cliente/resumen');
  const [horas, setHoras] = useState('1');
  const [salida, setSalida] = useState<any | null>(null);
  const a = useAccion();

  async function entrar(t: string) {
    const ok = await a.ejecutar(() => api('/cliente/parqueo/entrada', { cuerpo: { ticket: t } }));
    if (ok) void recargar();
  }
  useEffect(() => {
    if (ticket) void entrar(ticket);
  }, [ticket]);

  async function salir() {
    const s = await a.ejecutar(() => api('/cliente/parqueo/salida', { cuerpo: { horasConPuntos: Number(horas) } }));
    if (s) {
      setSalida(s);
      void recargar();
    }
  }

  if (cargando && !p) return <Cargando />;
  const maxHoras = p && r ? Math.min(p.horas, Math.floor(r.disponible / p.puntosPorHora)) : 0;

  return (
    <Pantalla>
      {salida ? (
        <>
          <T v="titulo">Buen viaje</T>
          <T>Estuviste {entero(salida.minutos)} minutos. Pagaste {salida.horas_gratis} h con {entero(salida.puntos_usados)} pts.</T>
          <T style={{ fontFamily: F.display, fontSize: 34 }}>{bs(salida.monto_bs)} <T tenue v="chico">a pagar en caja</T></T>
        </>
      ) : !p ? (
        <>
          <T tenue v="chico">Escanea el ticket del parqueo al entrar. Al salir puedes pagar las horas con tus puntos.</T>
          <Escaner onLeido={(t) => void entrar(t)} />
        </>
      ) : (
        <>
          <T v="senal" tenue>Ticket {p.ticket} · desde {hora(p.entrada_en)}</T>
          <T style={{ fontFamily: F.display, fontSize: 48 }}>{Math.floor(p.minutos / 60)} h {p.minutos % 60} min</T>
          <View style={{ borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 12, gap: 4 }}>
            <T>Tarifa {bs(p.tarifaHoraBs)} por hora · {p.horas} h a cobrar ({bs(p.montoBs)})</T>
            <T v="chico" oro>Cada hora cuesta {entero(p.puntosPorHora)} pts · tienes {entero(r?.disponible)} disponibles</T>
          </View>
          {maxHoras > 0 ? (
            <>
              <T v="senal" tenue>Horas a pagar con puntos</T>
              <Segmentado opciones={Array.from({ length: maxHoras + 1 }, (_, i) => ({ valor: String(i), texto: String(i) }))} valor={horas} onCambio={setHoras} />
            </>
          ) : <T v="chico" tenue>No te alcanzan los puntos para una hora; pagas en caja.</T>}
          <Boton titulo="Salir del parqueo" onPress={() => void salir()} cargando={a.enviando} />
        </>
      )}
      <Aviso texto={a.error} tipo="error" />
    </Pantalla>
  );
}
