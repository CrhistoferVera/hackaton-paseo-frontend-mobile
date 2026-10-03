import { Cargando, Fila, Pantalla, Vacio } from '@/components/ui';
import { bs, fechaHora, useDatos } from '@/lib/datos';

const EST: Record<string, string> = { recibido: 'Recibido', confirmado: 'Confirmado', preparando: 'Preparando', listo: 'Listo', cliente_llego: 'Llegaste', entregado: 'Entregado', vencido: 'Vencido' };

/** HU-Y10: historial de compras en PaseoYa con recompra desde el detalle. */
export default function Pedidos() {
  const { datos } = useDatos<any[]>('/cliente/pedidos');
  if (!datos) return <Cargando />;
  return (
    <Pantalla>
      {!datos.length && <Vacio texto="Todavía no hiciste pedidos en PaseoYa." />}
      {datos.map((p) => (
        <Fila key={p.id} titulo={`${p.codigo} · ${bs(p.total_bs)}`} detalle={`${fechaHora(p.creado_en)} · ${p.subpedidos.map((s: any) => `${s.local}: ${EST[s.estado]}`).join(' · ')}`} href={`/pedido/${p.id}`} />
      ))}
    </Pantalla>
  );
}
