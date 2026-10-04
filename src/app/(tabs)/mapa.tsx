import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { GuiaRuta } from '@/components/guia-ruta';
import { NOMBRE_SERVICIO, PlanoSvg, type CapasMapa, type DatosCapas } from '@/components/plano-svg';
import { Aviso, Boton, Campo, Cargando, Etiqueta, Fila, Pantalla, Segmentado, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { api } from '@/lib/api';
import { bs, hora, ubicacion, useDatos } from '@/lib/datos';
import { mostrarRuta, type RutaJarvis } from '@/lib/jarvis';

type Piso = string;

type Seleccion = { tipo: 'local'; l: any } | { tipo: 'servicio'; s: any } | null;

/**
 * HU-C10: mapa interactivo con guía. Muestra dónde estás (último QR, compra o «estoy aquí»), los locales
 * abiertos y cerrados, servicios, promociones activas, eventos, monedas y Drops en vivo. Al elegir un lugar,
 * «Cómo llegar» dibuja la ruta sobre el plano y guía paso a paso con voz.
 */
export default function Mapa() {
  const router = useRouter();
  const params = useLocalSearchParams<{ destino?: string }>();
  const { datos: plano } = useDatos<any>('/recinto/plano');
  const { datos: capas, recargar: recargarCapas } = useDatos<DatosCapas>('/recinto/capas');
  const { datos: posicion, recargar: recargarPosicion } = useDatos<any>('/cliente/posicion');
  const { datos: ofertas } = useDatos<any[]>('/cliente/ofertas');
  const misOfertas = useMemo(() => new Map<string, number>((ofertas ?? []).filter((o) => o.estado === 'activa' && !o.paso).map((o) => [o.local_id, Number(o.multiplicador)])), [ofertas]);
  const [pisoElegido, setPiso] = useState<Piso>('');
  const niveles = new Map<string, string>();
  for (const p of plano?.pisos ?? []) niveles.set(p.id, p.nombre);
  for (const p of [...(plano?.locales ?? []), ...(plano?.zonas ?? [])]) {
    if (p.piso && !niveles.has(p.piso)) niveles.set(p.piso, p.piso === 'T' ? 'Planta baja' : p.piso.replace(/^N/, 'Nivel '));
  }
  const PISOS = [...niveles].sort(([a], [b]) => a === b ? 0 : a === 'T' ? -1 : b === 'T' ? 1 : a.localeCompare(b, 'es', { numeric: true })).map(([valor, texto]) => ({ valor, texto }));
  const NOMBRE_PISO = Object.fromEntries(niveles);
  const piso = niveles.has(pisoElegido) ? pisoElegido : niveles.has(posicion?.nodo?.piso) ? posicion.nodo.piso : PISOS[0]?.valor ?? '';
  const [sel, setSel] = useState<Seleccion>(null);
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ locales: any[]; productos: any[] } | null>(null);
  const [mostrar, setMostrar] = useState<CapasMapa>({ promos: true, servicios: true, eventos: true, monedas: true });
  const [ruta, setRuta] = useState<RutaJarvis | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [fav, setFav] = useState<boolean | null>(null);

  // Las capas (promos, Drops, eventos) cambian con la hora: se refrescan al volver al mapa
  useFocusEffect(
    useCallback(() => {
      void recargarCapas();
      void recargarPosicion();
    }, [recargarCapas, recargarPosicion]),
  );

  const aqui = posicion?.nodo ? { x: Number(posicion.nodo.x), y: Number(posicion.nodo.y), piso: posicion.nodo.piso } : null;

  useEffect(() => {
    if (params.destino) void guiarA(params.destino);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.destino]);

  const promosPorLocal = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const p of capas?.promociones ?? []) m.set(p.local_id, [...(m.get(p.local_id) ?? []), p]);
    return m;
  }, [capas]);

  async function buscar() {
    if (q.trim().length < 2) return setRes(null);
    const r = await api(`/recinto/buscar?q=${encodeURIComponent(q)}`).catch(() => ({ locales: [], productos: [] }));
    // Servicios: «baño», «cajero», «lactancia»…
    const t = q.trim().toLowerCase();
    const servicios = (plano?.servicios ?? []).filter((s: any) => s.palabras_clave?.some((k: string) => k.includes(t) || t.includes(k)) || s.nombre.toLowerCase().includes(t));
    setRes({ ...r, servicios } as any);
    if (r.locales[0]) elegirLocal(r.locales[0]);
    else if (servicios[0]) elegirServicio(servicios[0]);
  }

  function elegirLocal(l: any) {
    if (ubicando) return void ubicarme(`local:${l.id}`, l.nombre);
    const completo = plano?.locales.find((x: any) => x.id === l.id) ?? l;
    setSel({ tipo: 'local', l: completo });
    setPiso(completo.piso);
    setFav(null);
  }

  function elegirServicio(s: any) {
    if (ubicando) return void ubicarme(`servicio:${s.id}`, s.nombre);
    setSel({ tipo: 'servicio', s });
    setPiso(s.piso);
  }

  async function ubicarme(nodoId: string, nombre: string) {
    setUbicando(false);
    try {
      await api('/cliente/posicion', { cuerpo: { nodoId } });
      setAviso(`Listo: estás en ${nombre}.`);
      void recargarPosicion();
    } catch (e: any) {
      setAviso(e.message);
    }
  }

  async function guiarA(destino: string) {
    try {
      const r = await api<RutaJarvis | null>(`/cliente/ruta?destino=${encodeURIComponent(destino)}`);
      if (!r) return setAviso('No encontramos un camino hasta ese lugar.');
      mostrarRuta(r);
      setRuta(r);
    } catch (e: any) {
      setAviso(e.message);
    }
  }

  async function favorito(l: any) {
    const r = await api('/cliente/favoritos', { cuerpo: { localId: l.id } });
    setFav(r.favorito);
  }

  const alternar = (k: keyof CapasMapa) => setMostrar((m) => ({ ...m, [k]: !m[k] }));

  if (!plano) return <Cargando />;

  if (ruta) {
    return (
      <Pantalla>
        <GuiaRuta
          ruta={ruta}
          plano={plano}
          capas={capas}
          onTerminar={() => setRuta(null)}
          alLlegar={() => {
            const ultimo = ruta.nodos[ruta.nodos.length - 1];
            if (ultimo) void api('/cliente/posicion', { cuerpo: { nodoId: ultimo.id } }).then(() => recargarPosicion()).catch(() => undefined);
            setRuta(null);
            setAviso(`Llegaste a ${ruta.destino ?? 'tu destino'}.`);
          }}
        />
      </Pantalla>
    );
  }

  const promosSel = sel?.tipo === 'local' ? promosPorLocal.get(sel.l.id) ?? [] : [];
  const ofertaSel = sel?.tipo === 'local' ? (ofertas ?? []).find((o) => o.local_id === sel.l.id && o.estado === 'activa' && !o.paso) : null;

  return (
    <Pantalla>
      <T v="titulo">Mapa del Paseo</T>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.linea, padding: 12 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.tinta, borderWidth: 3, borderColor: C.oroBrillo }} />
        <View style={{ flex: 1 }}>
          <T v="senal" tenue>{posicion?.conocida ? 'Estás aquí' : 'Ubicación aproximada'}</T>
          <T>{posicion?.nodo ? `${posicion.nodo.nombre} · ${NOMBRE_PISO[posicion.nodo.piso]}` : '—'}</T>
          {!posicion?.conocida && <T v="chico" tenue>Escanea un QR del Paseo o toca un lugar para ubicarte.</T>}
        </View>
        <View style={{ gap: 6 }}>
          <Pressable onPress={() => setUbicando((u) => !u)} hitSlop={8}><T v="senal" oro>{ubicando ? 'Cancelar' : 'Estoy en…'}</T></Pressable>
          <Pressable onPress={() => router.push('/escanear')} hitSlop={8}><T v="senal">Escanear QR</T></Pressable>
        </View>
      </View>
      {ubicando && <Aviso texto="Toca en el plano el local, el servicio o la entrada donde estás." />}
      {aviso && <Aviso texto={aviso} tipo="exito" />}

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="¿Qué buscas?" value={q} onChangeText={setQ} onSubmitEditing={() => void buscar()} returnKeyType="search" placeholder="pizza, baño, farmacia, audífonos" />
        </View>
        <Boton titulo="Buscar" onPress={() => void buscar()} />
      </View>

      <Segmentado opciones={PISOS} valor={piso} onCambio={setPiso} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {([['promos', 'Promociones'], ['servicios', 'Servicios'], ['eventos', 'Eventos'], ['monedas', 'Monedas y Drops']] as [keyof CapasMapa, string][]).map(([k, t]) => (
          <Pressable key={k} onPress={() => alternar(k)} style={{ borderWidth: 1, borderColor: mostrar[k] ? C.tinta : C.linea, backgroundColor: mostrar[k] ? C.tinta : 'transparent', paddingHorizontal: 10, paddingVertical: 6 }}>
            <T v="chico" style={{ color: mostrar[k] ? C.papel : C.grafito }}>{t}</T>
          </Pressable>
        ))}
      </View>

      <View style={{ borderWidth: 1, borderColor: ubicando ? C.oroBrillo : C.linea }}>
        <PlanoSvg
          plano={plano}
          piso={piso}
          capas={capas}
          mostrar={mostrar}
          misOfertas={misOfertas}
          aqui={aqui}
          seleccionado={sel?.tipo === 'local' ? sel.l.id : null}
          resaltados={new Set<string>(res?.locales.map((l) => l.id) ?? [])}
          onLocal={elegirLocal}
          onServicio={elegirServicio}
          onEntrada={(e) => (ubicando ? void ubicarme(e.id, e.nombre) : undefined)}
        />
      </View>
      <T v="chico" tenue>TÚ ×2 tu oferta personal · WC baños · ATM cajero automático · i información · + enfermería · L lactancia · N zona infantil · E escalera · A ascensor · ★ evento · D Drop · ×2 puntos multiplicados</T>

      {sel?.tipo === 'local' && (
        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T v="senal" oro>{ubicacion(sel.l)}</T>
            <Etiqueta texto={sel.l.abierto_ahora ? 'Abierto' : 'Cerrado'} tono={sel.l.abierto_ahora ? 'exito' : 'tenue'} />
          </View>
          <T v="titulo" style={{ fontSize: 26 }}>{sel.l.nombre}</T>
          <T tenue>{sel.l.categoria} · {sel.l.descripcion}</T>
          <T v="chico" tenue>Atiende de {String(sel.l.horario_apertura).slice(0, 5)} a {String(sel.l.horario_cierre).slice(0, 5)}{sel.l.telefono ? ` · Tel. ${sel.l.telefono}` : ''}</T>
          {ofertaSel && (
            <View style={{ backgroundColor: C.sala, padding: 10, gap: 2 }}>
              <T v="senal" oro oscuro>Tu oferta personal · {ofertaSel.hora_inicio.slice(0, 5)}–{ofertaSel.hora_fin.slice(0, 5)}</T>
              <T oscuro>{ofertaSel.motivo}</T>
            </View>
          )}
          {promosSel.map((p) => (
            <View key={p.id} style={{ backgroundColor: C.veladura, padding: 10 }}>
              <T v="senal" oro>{p.tipo === 'puntos_dobles' ? `Puntos ×${Number(p.multiplicador)} ahora` : 'Promoción ahora'}</T>
              <T>{p.titulo}</T>
            </View>
          ))}
          <Boton titulo="Cómo llegar" onPress={() => void guiarA(`local:${sel.l.id}`)} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Boton titulo="Ver productos" variante="claro" href={`/paseoya?local=${sel.l.id}` as any} estilo={{ flex: 1 }} />
            <Boton titulo={fav === null ? 'Favorito' : fav ? 'Guardado' : 'Quitado'} variante="claro" onPress={() => void favorito(sel.l)} estilo={{ flex: 1 }} />
          </View>
        </View>
      )}

      {sel?.tipo === 'servicio' && (
        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 12 }}>
          <T v="senal" oro>{NOMBRE_SERVICIO[sel.s.tipo] ?? 'Servicio'} · {NOMBRE_PISO[sel.s.piso]}</T>
          <T v="titulo" style={{ fontSize: 24 }}>{sel.s.nombre.charAt(0).toUpperCase() + sel.s.nombre.slice(1)}</T>
          <T tenue>{sel.s.descripcion}</T>
          {sel.s.horario && <T v="chico" tenue>Atiende {sel.s.horario}</T>}
          <Boton titulo="Cómo llegar" onPress={() => void guiarA(`servicio:${sel.s.id}`)} />
        </View>
      )}

      {res && (
        <View>
          {(res as any).servicios?.length > 0 && <T v="senal" tenue>Servicios</T>}
          {(res as any).servicios?.map((s: any) => <Fila key={s.id} titulo={s.nombre.charAt(0).toUpperCase() + s.nombre.slice(1)} detalle={NOMBRE_PISO[s.piso]} onPress={() => elegirServicio(s)} />)}
          {res.locales.length > 0 && <T v="senal" tenue style={{ marginTop: 12 }}>Locales</T>}
          {res.locales.map((l) => <Fila key={l.id} titulo={l.nombre} detalle={`${l.categoria} · ${ubicacion(l)}`} onPress={() => elegirLocal(l)} />)}
          {res.productos.length > 0 && <T v="senal" tenue style={{ marginTop: 12 }}>Productos</T>}
          {res.productos.map((p) => <Fila key={p.id} titulo={p.nombre} detalle={`${p.local} · ${p.piso} · Local ${p.numero_local}`} valor={bs(p.precio_bs)} href={`/producto/${p.id}`} />)}
          {!res.locales.length && !res.productos.length && !(res as any).servicios?.length && <T tenue>No encontramos «{q}». Prueba preguntarle a Jarvis.</T>}
        </View>
      )}

      {(capas?.eventos?.length ?? 0) > 0 && !sel && !res && (
        <View style={{ gap: 4 }}>
          <T v="senal" tenue>Hoy en el Paseo</T>
          {capas!.eventos.slice(0, 4).map((e: any) => (
            <Fila key={e.id} titulo={e.titulo} detalle={`${e.en_curso ? 'Ahora' : `${hora(e.inicio)}`} · ${e.lugar}${e.piso ? ` · ${NOMBRE_PISO[e.piso]}` : ''}`} valor={e.puntos ? `+${e.puntos} pts` : undefined} valorOro onPress={() => e.piso && setPiso(e.piso)} />
          ))}
        </View>
      )}
    </Pantalla>
  );
}
