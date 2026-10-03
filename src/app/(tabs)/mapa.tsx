import { useState } from 'react';
import { View } from 'react-native';
import { PlanoSvg } from '@/components/plano-svg';
import { Boton, Campo, Cargando, Fila, Pantalla, Segmentado, T, Vacio } from '@/components/ui';
import { api } from '@/lib/api';
import { bs, ubicacion, useDatos } from '@/lib/datos';

/** HU-C10: mapa interactivo y buscador por nombre, producto o categoría. */
export default function Mapa() {
  const { datos: plano } = useDatos<any>('/recinto/plano');
  const [piso, setPiso] = useState<'N1' | 'N2' | 'T'>('N1');
  const [sel, setSel] = useState<any | null>(null);
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ locales: any[]; productos: any[] } | null>(null);
  const [fav, setFav] = useState<boolean | null>(null);

  async function buscar() {
    if (q.trim().length < 2) return setRes(null);
    const r = await api(`/recinto/buscar?q=${encodeURIComponent(q)}`).catch(() => ({ locales: [], productos: [] }));
    setRes(r);
    if (r.locales[0]) elegir(r.locales[0]);
  }

  function elegir(l: any) {
    const completo = plano?.locales.find((x: any) => x.id === l.id) ?? l;
    setSel(completo);
    setPiso(completo.piso);
    setFav(null);
  }

  async function favorito() {
    const r = await api('/cliente/favoritos', { cuerpo: { localId: sel.id } });
    setFav(r.favorito);
  }

  const resaltados = new Set<string>(res?.locales.map((l) => l.id) ?? []);

  return (
    <Pantalla>
      <T v="titulo">Mapa del Paseo</T>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="¿Qué buscas?" value={q} onChangeText={setQ} onSubmitEditing={() => void buscar()} returnKeyType="search" placeholder="café, zapatillas, farmacia" />
        </View>
        <Boton titulo="Buscar" onPress={() => void buscar()} />
      </View>
      <Segmentado opciones={[{ valor: 'N1', texto: 'Nivel 1' }, { valor: 'N2', texto: 'Nivel 2' }, { valor: 'T', texto: 'Terrazas' }]} valor={piso} onCambio={setPiso} />
      {!plano ? <Cargando /> : <PlanoSvg plano={plano} piso={piso} resaltados={resaltados} seleccionado={sel?.id} onLocal={elegir} />}

      {sel && (
        <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: '#E4DED3', paddingTop: 12 }}>
          <T v="senal" oro>{ubicacion(sel)}</T>
          <T v="titulo" style={{ fontSize: 26 }}>{sel.nombre}</T>
          <T tenue>{sel.categoria} · {sel.descripcion}</T>
          <T v="chico" tenue>Abierto de {String(sel.horario_apertura).slice(0, 5)} a {String(sel.horario_cierre).slice(0, 5)}</T>
          <Boton titulo="Cómo llegar" href={`/ruta?destino=local:${sel.id}`} />
          <Boton titulo={fav === null ? 'Guardar en favoritos' : fav ? 'Guardado en favoritos' : 'Quitado de favoritos'} variante="claro" onPress={() => void favorito()} />
        </View>
      )}

      {res && (
        <View>
          <T v="senal" tenue>Locales</T>
          {res.locales.length ? res.locales.map((l) => <Fila key={l.id} titulo={l.nombre} detalle={`${l.categoria} · ${ubicacion(l)}`} onPress={() => elegir(l)} />) : <Vacio texto={`Ningún local coincide con «${q}».`} />}
          {res.productos.length > 0 && <T v="senal" tenue style={{ marginTop: 12 }}>Productos</T>}
          {res.productos.map((p) => <Fila key={p.id} titulo={p.nombre} detalle={`${p.local} · ${p.piso} · Local ${p.numero_local}`} valor={bs(p.precio_bs)} href={`/producto/${p.id}`} />)}
        </View>
      )}
    </Pantalla>
  );
}
