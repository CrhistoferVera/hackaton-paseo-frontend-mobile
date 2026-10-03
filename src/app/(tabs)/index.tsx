import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import { Aviso, Barra, Boton, ChipNivel, Etiqueta, Fila, IrA, Pantalla, Seccion, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { api } from '@/lib/api';
import { bs, entero, fecha, useDatos } from '@/lib/datos';
import { useSesion } from '@/lib/sesion';
import { useTiempoReal } from '@/lib/tiempo-real';

/** Inicio: saldo en tiempo real (HU-C04), nivel (HU-C05), pase a un toque (HU-C03), misiones (HU-C13) y avisos por geocerca (HU-C20). */
export default function Inicio() {
  const { usuario } = useSesion();
  const router = useRouter();
  const { datos: r, recargar } = useDatos<any>('/cliente/resumen');
  const { datos: misiones, recargar: recargarMisiones } = useDatos<any[]>('/cliente/misiones');
  const { datos: promos } = useDatos<any[]>('/cliente/promociones');
  const { datos: notifs, recargar: recargarNotifs } = useDatos<any[]>('/cliente/notificaciones');
  const [ultimo, setUltimo] = useState<{ puntos: number; descripcion: string } | null>(null);
  const [aviso, setAviso] = useState<any | null>(null);
  const linea = useRef(new Animated.Value(0)).current;

  const acunar = () => {
    linea.setValue(0);
    Animated.timing(linea, { toValue: 1, duration: 1100, useNativeDriver: false }).start();
  };

  useTiempoReal({
    puntos: (d: any) => {
      if (d.puntos) {
        setUltimo({ puntos: d.puntos, descripcion: d.descripcion });
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        acunar();
      }
      void recargar();
      void recargarMisiones();
    },
    notificacion: (n: any) => {
      setAviso(n);
      void recargarNotifs();
    },
  });

  // HU-C20: con permiso, la ubicación se envía mientras la app está abierta
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      const priv = await api('/cliente/privacidad').catch(() => null);
      if (!priv?.consent_ubicacion) return;
      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' as const }));
      if (status !== 'granted') return;
      const enviar = async () => {
        try {
          const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const res = await api('/cliente/ubicacion', { cuerpo: { lat: p.coords.latitude, lng: p.coords.longitude } });
          if (res.avisos?.length) setAviso(res.avisos[0]);
        } catch {
          /* sin señal GPS */
        }
      };
      void enviar();
      timer = setInterval(enviar, 120_000);
    })();
    return () => clearInterval(timer);
  }, []);

  useEffect(acunar, [linea]);

  const sinLeer = notifs?.filter((n) => !n.leida).length ?? 0;
  const activas = misiones?.filter((m) => !m.completada).slice(0, 3) ?? [];

  return (
    <Pantalla>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T tenue>Hola, {usuario?.nombre.split(' ')[0]}</T>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <IrA href="/notificaciones"><T v="senal" oro={sinLeer > 0} tenue={!sinLeer}>Avisos{sinLeer ? ` · ${sinLeer}` : ''}</T></IrA>
          {r && <ChipNivel nivel={r.nivel.nivel} />}
        </View>
      </View>

      {aviso && (
        <Pressable onPress={() => { setAviso(null); if (aviso.datos?.hito) router.push(`/ar/${encodeURIComponent(aviso.datos.hito)}`); else if (aviso.datos?.pedidoId) router.push(`/pedido/${aviso.datos.pedidoId}`); }} style={{ backgroundColor: C.sala, padding: 14, gap: 4 }}>
          <T v="senal" oro oscuro>{aviso.titulo}</T>
          <T oscuro>{aviso.cuerpo}</T>
        </Pressable>
      )}

      <View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <T v="cifra">{r ? entero(r.saldo) : '—'}</T>
          <T v="senal" oro>puntos</T>
        </View>
        <Animated.View style={{ height: 1, backgroundColor: C.oroBrillo, marginTop: 10, width: linea.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
        {r && (
          <T v="chico" tenue style={{ marginTop: 8 }}>
            Equivale a {bs(r.valorBs)}
            {r.porVencer[0] ? ` · ${entero(r.porVencer[0].puntos)} vencen el ${fecha(r.porVencer[0].fecha)}` : ''}
            {r.reservado ? ` · ${entero(r.reservado)} reservados en cupones` : ''}
          </T>
        )}
        {ultimo && <T v="chico" oro style={{ marginTop: 4 }}>{ultimo.puntos > 0 ? '+' : ''}{entero(ultimo.puntos)} · {ultimo.descripcion}</T>}
      </View>

      {r && (
        <IrA href="/nivel" estilo={{ gap: 6 }}>
            <Barra progreso={r.nivel.progreso} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T v="chico" tenue>{r.nivel.nivel}</T>
              <T v="chico" tenue>{r.nivel.siguiente ? `${entero(r.nivel.faltan)} pts para ${r.nivel.siguiente}` : 'Nivel máximo'}</T>
            </View>
        </IrA>
      )}

      <Boton href="/pase" titulo="Mostrar mi pase" derecha={<T oscuro oro v="senal">QR</T>} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Boton href="/escanear" titulo="Escanear" variante="claro" estilo={{ flex: 1 }} />
        <Boton href="/escanear?modo=llegada" titulo="Llegué al Paseo" variante="claro" estilo={{ flex: 1 }} />
      </View>
      <Boton href="/jarvis" titulo="Hablar con Jarvis" variante="claro" derecha={<T v="senal" oro>Voz</T>} />

      <Seccion titulo="Misiones para ti" accion={<IrA href="/misiones"><T v="senal" tenue>Ver todas</T></IrA>}>
        {activas.map((m) => (
          <Fila key={m.id} titulo={m.nombre} detalle={`${m.local ? `${m.local.piso} · Local ${m.local.numero_local} · ` : ''}${m.avance}/${m.meta} · vence ${fecha(m.vigenteHasta)}`} valor={`+${m.recompensa}`} valorOro href="/misiones" />
        ))}
        {!activas.length && <T tenue v="chico">Completaste tus misiones. Pronto llegan nuevas.</T>}
      </Seccion>

      {!!promos?.length && (
        <Seccion titulo="Promociones vigentes">
          {promos.slice(0, 4).map((p) => (
            <Fila key={p.id} titulo={p.titulo} detalle={`${p.local ?? 'Todo el Paseo'}${p.piso ? ` · ${p.piso} · Local ${p.numero_local}` : ''} · ${p.hora_inicio.slice(0, 5)}–${p.hora_fin.slice(0, 5)}`} izquierda={p.activa_ahora ? <Etiqueta texto="Ahora" tono="oro" /> : undefined} valor={p.tipo === 'puntos_dobles' ? `×${Number(p.multiplicador)}` : 'Cupón'} valorOro />
          ))}
        </Seccion>
      )}
      <Aviso texto={!r ? null : r.saldo === 0 ? 'Muestra tu pase al pagar en cualquier local del Paseo para empezar a sumar.' : null} />
    </Pantalla>
  );
}
