import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Aviso, Etiqueta, Fila, Pantalla, Seccion, T, Vacio } from '@/components/ui';
import { C } from '@/constants/theme';
import { api } from '@/lib/api';
import { entero, fechaHora, useAccion, useDatos } from '@/lib/datos';
import { useTiempoReal } from '@/lib/tiempo-real';

/** HU-C07 (catálogo) y HU-C08 (canje con cupón de un solo uso). */
export default function Canjes() {
  const router = useRouter();
  const { datos: cat, recargar } = useDatos<any>('/cliente/recompensas');
  const { datos: cupones, recargar: recargarCupones } = useDatos<any[]>('/cliente/canjes');
  const [confirmar, setConfirmar] = useState<any | null>(null);
  const a = useAccion();
  useTiempoReal({ canje: () => { void recargar(); void recargarCupones(); }, puntos: () => void recargar() });

  async function canjear() {
    const c = await a.ejecutar(() => api('/cliente/canjes', { cuerpo: { recompensaId: confirmar.id } }));
    if (c) {
      setConfirmar(null);
      router.push(`/cupon/${c.id}`);
    }
  }

  const vigentes = cupones?.filter((c) => c.estado === 'emitido' && new Date(c.expira_en) > new Date()) ?? [];

  return (
    <Pantalla>
      <T v="titulo">Canjes</T>
      {cat && <T tenue>Tienes <T oro style={{ fontFamily: 'BodoniModa_500Medium' }}>{entero(cat.disponible)} pts</T> disponibles para canjear.</T>}

      {vigentes.length > 0 && (
        <Seccion titulo="Cupones listos para usar">
          {vigentes.map((c) => <Fila key={c.id} titulo={c.recompensa} detalle={`Vence ${fechaHora(c.expira_en)}`} valor="Mostrar" href={`/cupon/${c.id}`} />)}
        </Seccion>
      )}

      <Seccion titulo="Recompensas">
        {cat?.recompensas.map((r: any) => (
          <Pressable key={r.id} onPress={() => (r.puedeCanjear ? setConfirmar(r) : null)} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.linea, gap: 6, opacity: r.puedeCanjear ? 1 : 0.6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <T style={{ fontFamily: 'Inter_500Medium', flex: 1 }}>{r.nombre}</T>
              <T v="subtitulo" oro>{entero(r.costo_puntos)}</T>
            </View>
            <T v="chico" tenue>{r.local ? `${r.local} · ${r.piso} · Local ${r.numero_local}` : 'Cualquier local del Paseo'}{r.stock !== null ? ` · quedan ${r.stock}` : ''}</T>
            {r.puedeCanjear ? <Etiqueta texto="Puedes canjear ahora" tono="exito" /> : <T v="chico" tenue>Te faltan {entero(r.faltan)} pts</T>}
            {confirmar?.id === r.id && (
              <View style={{ backgroundColor: C.veladura, padding: 14, gap: 10, marginTop: 6 }}>
                <T>Canjear {entero(r.costo_puntos)} pts por {r.nombre}. El cupón dura 15 minutos y los puntos se descuentan recién cuando el local lo valida.</T>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => void canjear()} style={{ backgroundColor: C.tinta, paddingVertical: 10, paddingHorizontal: 14 }}><T v="senal" oscuro>{a.enviando ? 'Generando…' : 'Generar cupón'}</T></Pressable>
                  <Pressable onPress={() => setConfirmar(null)} style={{ paddingVertical: 10, paddingHorizontal: 14 }}><T v="senal" tenue>Cancelar</T></Pressable>
                </View>
              </View>
            )}
          </Pressable>
        ))}
      </Seccion>
      <Aviso texto={a.error} tipo="error" />

      <Seccion titulo="Historial de canjes">
        {cupones?.filter((c) => c.estado !== 'emitido').slice(0, 10).map((c) => (
          <Fila key={c.id} titulo={c.recompensa} detalle={c.estado === 'validado' ? `Usado ${fechaHora(c.validado_en)} en ${c.local_validador}` : `Venció ${fechaHora(c.expira_en)} · no perdiste puntos`} valor={c.estado === 'validado' ? `−${entero(c.costo_puntos)}` : ''} />
        ))}
        {!cupones?.length && <Vacio texto="Aún no canjeaste recompensas." />}
      </Seccion>
    </Pantalla>
  );
}
