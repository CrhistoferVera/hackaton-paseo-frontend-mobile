import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Cargando, Fila, Pantalla, Vacio } from '@/components/ui';
import { api } from '@/lib/api';
import { fechaHora, useDatos } from '@/lib/datos';

/** Avisos: puntos dobles cerca (HU-C20), Drops, misiones cumplidas, estado de pedidos y referidos. */
export default function Notificaciones() {
  const router = useRouter();
  const { datos } = useDatos<any[]>('/cliente/notificaciones');
  useEffect(() => {
    void api('/cliente/notificaciones/leidas', { cuerpo: {} }).catch(() => undefined);
  }, []);
  if (!datos) return <Cargando />;
  return (
    <Pantalla>
      {!datos.length && <Vacio texto="No tienes avisos todavía." />}
      {datos.map((n) => (
        <Fila
          key={n.id}
          titulo={n.titulo}
          detalle={`${n.cuerpo} · ${fechaHora(n.creado_en)}`}
          onPress={() => (n.datos?.hito ? router.push(`/ar/${encodeURIComponent(n.datos.hito)}`) : n.datos?.pedidoId ? router.push(`/pedido/${n.datos.pedidoId}`) : undefined)}
        />
      ))}
    </Pantalla>
  );
}
