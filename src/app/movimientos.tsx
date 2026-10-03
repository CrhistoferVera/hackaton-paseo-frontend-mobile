import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Cargando, Fila, Pantalla, Segmentado, T, Vacio } from '@/components/ui';
import { bs, fechaHora, useDatos } from '@/lib/datos';

const TIPOS = [
  { valor: '', texto: 'Todos' }, { valor: 'compra', texto: 'Compras' }, { valor: 'canje', texto: 'Canjes' }, { valor: 'bono', texto: 'Bonos' },
  { valor: 'mision', texto: 'Misiones' }, { valor: 'paseoya', texto: 'PaseoYa' }, { valor: 'referido', texto: 'Referidos' }, { valor: 'vencimiento', texto: 'Vencidos' },
];
const RANGOS = [{ valor: '7', texto: '7 días' }, { valor: '30', texto: '30 días' }, { valor: '365', texto: 'Año' }];

/** HU-C06: historial con filtros por tipo y fecha. */
export default function Movimientos() {
  const [tipo, setTipo] = useState('');
  const [rango, setRango] = useState('30');
  const desde = new Date(Date.now() - Number(rango) * 86400_000).toISOString().slice(0, 10);
  const { datos } = useDatos<any[]>(`/cliente/movimientos?desde=${desde}${tipo ? `&tipo=${tipo}` : ''}`);
  return (
    <Pantalla>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Segmentado opciones={TIPOS} valor={tipo} onCambio={setTipo} />
      </ScrollView>
      <Segmentado opciones={RANGOS} valor={rango} onCambio={setRango} />
      {!datos ? <Cargando /> : !datos.length ? <Vacio texto="Sin movimientos en este período." /> : (
        datos.map((m) => (
          <Fila
            key={m.id}
            titulo={m.descripcion}
            detalle={`${fechaHora(m.creado_en)}${m.local ? ` · ${m.local}` : ''}${m.monto_bs ? ` · ${bs(m.monto_bs)}` : ''}`}
            valor={`${m.puntos > 0 ? '+' : ''}${m.puntos}`}
            valorOro={m.puntos > 0}
          />
        ))
      )}
      <T v="chico" tenue>Los puntos vencen a los 12 meses de ganarse; se usan primero los más antiguos.</T>
    </Pantalla>
  );
}
