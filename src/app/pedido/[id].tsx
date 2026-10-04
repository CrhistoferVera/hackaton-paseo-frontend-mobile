import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { OrderStatusChip } from '@/components/order-status-chip';
import { Aviso, Boton, Cargando, Etiqueta, Pantalla, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api } from '@/lib/api';
import { useCarrito } from '@/lib/carrito';
import { bs, ubicacion, useAccion, useDatos } from '@/lib/datos';
import { useTiempoReal } from '@/lib/tiempo-real';

const ORDEN = ['recibido', 'preparando', 'listo', 'entregado'];
const ETIQUETA: Record<string, string> = {
  recibido: 'Pedido recibido',
  confirmado: 'Confirmado por el local',
  preparando: 'Preparando',
  listo: 'Listo para recoger',
  cliente_llego: 'Avisaste que llegaste',
  entregado: 'Entregado',
  vencido: 'Vencido',
};

/** HU-Y06 (estado en tiempo real), HU-Y07 (QR + PIN por local), HU-Y08 (Llegué), HU-Y11 (comprobante), HU-Y10 (recompra). */
export default function Pedido() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const carritos = useCarrito();
  const { datos: p, recargar } = useDatos<any>(`/cliente/pedidos/${id}`);
  const a = useAccion();
  useTiempoReal({ pedido: () => void recargar(), connect: () => void recargar() });

  if (!p) return <Cargando />;
  const activos = p.subpedidos.filter((s: any) => !['entregado', 'vencido'].includes(s.estado));
  const yaAviso = p.subpedidos.every((s: any) => s.llego_en || ['entregado', 'vencido'].includes(s.estado));

  async function llegue() {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await a.ejecutar(() => api(`/cliente/pedidos/${id}/llegue`, { cuerpo: {} }));
    void recargar();
  }

  async function comprobante() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled) return;
    const archivo = r.assets[0];
    const fd = new FormData();
    if (Platform.OS === 'web') {
      const blob = await (await fetch(archivo.uri)).blob();
      fd.append('archivo', blob, 'comprobante.jpg');
    } else {
      fd.append('archivo', { uri: archivo.uri, name: 'comprobante.jpg', type: archivo.mimeType ?? 'image/jpeg' } as any);
    }
    await a.ejecutar(() => api(`/cliente/pedidos/${id}/comprobante`, { formulario: fd }));
    void recargar();
  }

  async function repetir() {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const items = await a.ejecutar(() => api<any[]>(`/cliente/pedidos/${id}/repetir`, { cuerpo: {} }));
    if (!items) return;
    for (const i of items) {
      carritos[i.producto.ambito === 'comida' ? 'comida' : 'retail'].agregar({
        productoId: i.productoId,
        nombre: i.producto.nombre,
        precioBs: i.precioBs,
        varianteIds: i.varianteIds,
        varianteDetalle: i.varianteDetalle,
        cantidad: i.cantidad,
        localId: i.producto.local_id,
        local: i.producto.local,
        ubicacion: ubicacion(i.producto),
        ambito: i.producto.ambito,
        tipo: i.producto.ambito === 'comida' ? 'comida' : 'retail',
      });
    }
    router.push(`/carrito?tipo=${p.tipo}`);
  }

  return (
    <Pantalla edges={[]} contenido={{ paddingTop: 14, paddingBottom: 64 }}>
      {/* Configuración del Header: Título 'Pedido', sin botón texto 'Atrás', flecha única vectorial */}
      <Stack.Screen
        options={{
          title: 'Pedido',
          headerBackVisible: false,
          gestureEnabled: true,
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              hitSlop={10}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color={C.tinta} />
            </Pressable>
          ),
        }}
      />

      {/* Fila superior: Código y subtítulo de seguimiento */}
      <View style={styles.headerInfoFila}>
        <T style={styles.codigoTexto}>{p.codigo}</T>
        <T v="chico" tenue>
          {p.tipo === 'retail'
            ? `Llegada estimada: ${String(p.fecha_estimada_retiro).slice(0, 10)}`
            : 'Seguimiento en vivo'}
        </T>
      </View>

      {/* Problema B1: Monto total grande con lineHeight amplio y paddingVertical para evitar recorte */}
      <View style={styles.montoContenedor}>
        <T
          style={styles.totalMonto}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {bs(p.total_bs)}
        </T>
      </View>

      <T v="chico" oro style={styles.puntosTexto}>
        +{Math.floor(Number(p.total_bs))} pts al retirar · paga en cada local
      </T>

      {/* Locales y Subpedidos */}
      {p.subpedidos.map((s: any) => {
        const orden = p.tipo === 'retail' ? ['recibido', 'listo', 'entregado'] : ORDEN;
        const paso = orden.indexOf(
          s.estado === 'confirmado' ? 'recibido' : s.estado === 'cliente_llego' ? 'listo' : s.estado,
        );
        const entregado = s.estado === 'entregado';

        return (
          <View key={s.id} style={styles.localCard}>
            {/* Cabecera del local */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <T style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: C.tinta }}>{s.local}</T>
                <T v="chico" tenue>{ubicacion(s)}</T>
              </View>
            </View>

            {/* Problema B2: Bloque prominente destacado del PIN de retiro */}
            <View
              style={[styles.pinBloque, entregado && styles.pinBloqueAtenuado]}
              accessibilityRole="text"
              accessibilityLabel={`PIN de retiro ${String(s.pin || '').split('').join(' ')}`}
            >
              <T style={styles.pinEtiqueta}>PIN DE RETIRO</T>
              <T style={styles.pinValor}>{s.pin}</T>
            </View>

            {/* Líneas de productos */}
            <View style={{ gap: 4, marginVertical: 2 }}>
              {s.items.map((i: any) => (
                <T key={i.id} v="chico" style={{ color: C.tinta }}>
                  {i.cantidad} × {i.nombre}
                  {i.variante_detalle ? ` · ${i.variante_detalle}` : ''} · {bs(i.precio_bs * i.cantidad)}
                </T>
              ))}
            </View>

            {/* Barra de progreso de 4 segmentos */}
            <View style={styles.barraProgreso}>
              {orden.map((e, k) => (
                <View
                  key={e}
                  style={[
                    styles.segmentoBarra,
                    {
                      backgroundColor:
                        s.estado === 'vencido'
                          ? C.alerta
                          : k < paso
                          ? C.tinta
                          : k === paso
                          ? C.oroBrillo
                          : C.linea,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Problema B3: Chip de estado resaltado unificado */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <OrderStatusChip estado={s.estado} />
              {entregado ? (
                <Etiqueta texto={`+${s.puntos} pts`} tono="oro" />
              ) : (
                <T v="chico" tenue>
                  Paso {Math.max(paso + 1, 1)} de {orden.length}
                </T>
              )}
            </View>

            <T v="chico" tenue>
              {orden.map((e) => ETIQUETA[e] ?? e).join(' → ')}
            </T>

            {p.tipo === 'comida' && ['recibido', 'confirmado', 'preparando'].includes(s.estado) && (
              <T v="chico" oro>
                {s.tiempo_preparacion_min != null
                  ? `Preparación estimada: ${s.tiempo_preparacion_min} min`
                  : 'El restaurante confirmará la preparación'}
              </T>
            )}

            {/* Código QR si el pedido está listo para recoger */}
            {['listo', 'cliente_llego'].includes(s.estado) && (
              <View style={styles.qrContenedor}>
                <QRCode value={s.qr} size={150} color={C.tinta} />
                <T v="chico" tenue style={{ marginTop: 8, textAlign: 'center' }}>
                  Muestra este QR o dicta el PIN en {s.local}
                </T>
              </View>
            )}

            {s.pago === 'qr_anticipado' && (
              s.comprobante_url ? (
                <Etiqueta texto="Comprobante enviado" tono="exito" />
              ) : (
                <Boton titulo="Adjuntar comprobante del pago QR" variante="claro" onPress={() => void comprobante()} />
              )
            )}
          </View>
        );
      })}

      {/* Botones de acción del pedido */}
      {activos.length > 0 && !yaAviso && (
        <Boton titulo="Llegué al Paseo" variante="oro" onPress={() => void llegue()} cargando={a.enviando} />
      )}
      {activos.length > 0 && yaAviso && (
        <Aviso
          texto="Avisamos a los locales que llegaste. Te entregarán cuando el pedido esté listo."
          tipo="exito"
        />
      )}
      {!activos.length && (
        <Boton titulo="Volver a pedir lo mismo" variante="claro" onPress={() => void repetir()} />
      )}
      <Aviso texto={a.error} tipo="error" />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  codigoTexto: {
    fontFamily: F.datoMedio,
    fontSize: 18,
    color: C.tinta,
  },
  montoContenedor: {
    marginVertical: 2,
    overflow: 'visible',
  },
  totalMonto: {
    fontFamily: F.display,
    fontSize: 38,
    lineHeight: 52, // ~1.37x fontSize para evitar recorte vertical en fuentes serif
    paddingVertical: 6,
    includeFontPadding: true, // fix para Android
    color: C.tinta,
    overflow: 'visible',
  },
  puntosTexto: {
    marginTop: 2,
    marginBottom: 8,
  },
  localCard: {
    borderTopWidth: 1,
    borderTopColor: C.lineaFuerte,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 12,
  },
  pinBloque: {
    backgroundColor: C.veladura,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.linea,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginVertical: 4,
  },
  pinBloqueAtenuado: {
    opacity: 0.5,
  },
  pinEtiqueta: {
    fontFamily: F.senal,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.grafito,
  },
  pinValor: {
    fontFamily: F.datoMedio,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 8,
    color: C.tinta,
    includeFontPadding: true,
  },
  barraProgreso: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 4,
  },
  segmentoBarra: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  qrContenedor: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderWidth: 1,
    borderColor: C.linea,
    borderRadius: 14,
    marginVertical: 4,
  },
});
