import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { GuiaRuta } from '@/components/guia-ruta';
import { type DatosCapas } from '@/components/plano-svg';
import { Cargando, Pantalla, Vacio } from '@/components/ui';
import { api } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { mostrarRuta, useRutaActual } from '@/lib/jarvis';

/**
 * Ruta paso a paso sobre el plano:
 * el tramo del paso actual se resalta en el piso que corresponde y Jarvis lo lee en voz alta.
 */
export default function Ruta() {
  const { destino } = useLocalSearchParams<{ destino?: string }>();
  const router = useRouter();
  const ruta = useRutaActual();
  const { datos: plano } = useDatos<any>('/recinto/plano');
  const { datos: capas } = useDatos<DatosCapas>('/recinto/capas');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!destino) return;
    api(`/cliente/ruta?destino=${encodeURIComponent(destino)}`)
      .then((r) => (r ? mostrarRuta(r) : setError('No encontramos un camino hasta ese lugar.')))
      .catch((e) => setError(e.message));
  }, [destino]);

  if (error) return <Pantalla><Vacio texto={error} /></Pantalla>;
  if (!ruta || !plano) return <Cargando />;

  return (
    <Pantalla>
      <GuiaRuta
        ruta={ruta}
        plano={plano}
        capas={capas}
        onTerminar={() => router.back()}
        alLlegar={() => {
          const ultimo = ruta.nodos[ruta.nodos.length - 1];
          if (ultimo) void api('/cliente/posicion', { cuerpo: { nodoId: ultimo.id } }).catch(() => undefined);
          router.back();
        }}
      />
    </Pantalla>
  );
}
