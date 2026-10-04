import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Aviso, Pantalla, Segmentado, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api } from '@/lib/api';
import { claveItem, useCarrito, type CartSection, type TipoCarrito } from '@/lib/carrito';
import { bs, useAccion } from '@/lib/datos';

export default function Carrito() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string; tipo?: string }>();
  const carritos = useCarrito();
  const a = useAccion();

  // 1. Selección inicial según regla:
  // - Sección desde la que el usuario llegó (params.section o params.tipo)
  // - Si no hay parámetro, la que tenga productos
  // - Si ambas tienen (o ambas están vacías), PaseoFood
  const [seccion, setSeccion] = useState<CartSection>(() => {
    if (params.section === 'shop' || params.tipo === 'retail') return 'shop';
    if (params.section === 'food' || params.tipo === 'comida') return 'food';
    const tieneFood = carritos.comida.items.length > 0;
    const tieneShop = carritos.retail.items.length > 0;
    if (tieneShop && !tieneFood) return 'shop';
    return 'food';
  });

  // Ajuste si se cargaron los items y no había parámetro explícito
  const paramExplicito = params.section || params.tipo;
  useEffect(() => {
    if (!paramExplicito && carritos.retail.cargado && carritos.comida.cargado) {
      if (carritos.retail.items.length > 0 && carritos.comida.items.length === 0) {
        setSeccion('shop');
      }
    }
  }, [carritos.retail.cargado, carritos.comida.cargado, paramExplicito]);

  const countFood = carritos.comida.cantidadTotal;
  const countShop = carritos.retail.cantidadTotal;
  const totalGeneral = countFood + countShop;

  const tipo: TipoCarrito = seccion === 'food' ? 'comida' : 'retail';
  const { porLocal, total, cambiar, vaciar, items, cargado, error } = carritos[tipo];

  const otraSeccion: CartSection = seccion === 'food' ? 'shop' : 'food';
  const otraCantidad = seccion === 'food' ? countShop : countFood;
  const nombreOtraSeccion = seccion === 'food' ? 'PaseoShop' : 'PaseoFood';

  const [dia, setDia] = useState(0);

  const cambiarSeccion = (nueva: CartSection) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSeccion(nueva);
  };

  async function confirmar() {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const fecha = new Date(Date.now() - 4 * 3600_000 + dia * 86400_000).toISOString().slice(0, 10);
    const r = await a.ejecutar(() =>
      api('/cliente/pedidos', {
        cuerpo: {
          items: items.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad,
            dropId: i.dropId ?? null,
            varianteIds: i.varianteIds ?? [],
          })),
          tipo,
          fechaEstimadaRetiro: tipo === 'retail' ? fecha : undefined,
          pago: 'en_local',
        },
      }),
    );
    if (r) {
      // Retirar solo los items de la sección activa
      vaciar();
      router.replace(`/pedido/${r.pedidoId}`);
    }
  }

  return (
    <Pantalla edges={[]} contenido={{ paddingTop: 14, paddingBottom: 64 }}>
      {/* Configuración del Header Nativo: Título único "Mi carrito", sin botón "Atrás", flecha vectorial en headerLeft */}
      <Stack.Screen
        options={{
          title: 'Mi carrito',
          headerBackVisible: false,
          gestureEnabled: true,
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.navBackButton,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color={C.tinta} />
            </Pressable>
          ),
        }}
      />

      {/* 1. TOGGLE SEGMENTADO "PASEOFOOD | PASEOSHOP" (Directamente bajo el header nativo) */}
      <View style={styles.toggleContainer} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: seccion === 'food' }}
          accessibilityLabel={`Ver carrito de PaseoFood${countFood > 0 ? `, ${countFood} productos` : ', vacío'}`}
          onPress={() => cambiarSeccion('food')}
          style={({ pressed }) => [
            styles.toggleBtn,
            seccion === 'food' ? styles.toggleBtnActivo : styles.toggleBtnInactivo,
            countFood === 0 && seccion !== 'food' && styles.toggleBtnAtenuado,
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
        >
          <T
            style={[
              styles.toggleTexto,
              seccion === 'food' ? styles.toggleTextoActivo : styles.toggleTextoInactivo,
              countFood === 0 && seccion !== 'food' && { color: C.lineaFuerte },
            ]}
            numberOfLines={1}
          >
            {countFood > 0 ? `PaseoFood · ${countFood}` : 'PaseoFood'}
          </T>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: seccion === 'shop' }}
          accessibilityLabel={`Ver carrito de PaseoShop${countShop > 0 ? `, ${countShop} productos` : ', vacío'}`}
          onPress={() => cambiarSeccion('shop')}
          style={({ pressed }) => [
            styles.toggleBtn,
            seccion === 'shop' ? styles.toggleBtnActivo : styles.toggleBtnInactivo,
            countShop === 0 && seccion !== 'shop' && styles.toggleBtnAtenuado,
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
        >
          <T
            style={[
              styles.toggleTexto,
              seccion === 'shop' ? styles.toggleTextoActivo : styles.toggleTextoInactivo,
              countShop === 0 && seccion !== 'shop' && { color: C.lineaFuerte },
            ]}
            numberOfLines={1}
          >
            {countShop > 0 ? `PaseoShop · ${countShop}` : 'PaseoShop'}
          </T>
        </Pressable>
      </View>

      <Aviso texto={error} tipo="error" />

      {/* 2. ESTADOS VACÍOS */}
      {/* Caso A: Carrito completamente vacío */}
      {totalGeneral === 0 && cargado ? (
        <View style={styles.vacioCard}>
          <View style={styles.vacioIconoContenedor}>
            <Ionicons name="cart-outline" size={44} color={C.grafito} />
          </View>
          <T style={styles.vacioTitulo}>Tu carrito está vacío</T>
          <T style={styles.vacioSubtitulo}>Explora restaurantes y tiendas para agregar productos a tu pedido.</T>
          <View style={styles.vacioAcciones}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ir a PaseoFood"
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/buscar?section=food');
              }}
              style={({ pressed }) => [styles.btnPildoraSecundario, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <Ionicons name="restaurant-outline" size={16} color={C.tinta} />
              <T style={styles.btnPildoraSecundarioTexto}>Ir a PaseoFood</T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ir a PaseoShop"
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/buscar?section=shop');
              }}
              style={({ pressed }) => [styles.btnPildoraSecundario, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <Ionicons name="pricetag-outline" size={16} color={C.tinta} />
              <T style={styles.btnPildoraSecundarioTexto}>Ir a PaseoShop</T>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Caso B: Sección activa vacía pero la otra sí tiene productos */}
      {totalGeneral > 0 && !items.length && cargado ? (
        <View style={styles.vacioCard}>
          <View style={styles.vacioIconoContenedor}>
            <Ionicons
              name={seccion === 'food' ? 'restaurant-outline' : 'pricetag-outline'}
              size={40}
              color={C.grafito}
            />
          </View>
          <T style={styles.vacioTitulo}>
            {seccion === 'food' ? 'Tu carrito de PaseoFood está vacío' : 'Tu carrito de PaseoShop está vacío'}
          </T>
          <T style={styles.vacioSubtitulo}>
            {seccion === 'food'
              ? 'No tienes comida ni bebidas agregadas a tu pedido.'
              : 'No tienes productos de tiendas agregados a tu pedido.'}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={seccion === 'food' ? 'Explorar restaurantes' : 'Explorar tiendas'}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(seccion === 'food' ? '/buscar?section=food' : '/buscar?section=shop');
            }}
            style={({ pressed }) => [styles.btnPildoraPrincipal, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <T style={styles.btnPildoraPrincipalTexto}>
              {seccion === 'food' ? 'Explorar Restaurantes' : 'Explorar Tiendas'}
            </T>
          </Pressable>

          {otraCantidad > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cambiar a ${nombreOtraSeccion}`}
              onPress={() => cambiarSeccion(otraSeccion)}
              style={({ pressed }) => [styles.avisoCambioSeccion, pressed && { opacity: 0.7 }]}
            >
              <T style={styles.avisoCambioSeccionTexto}>
                Tienes {otraCantidad} {otraCantidad === 1 ? 'producto' : 'productos'} en {nombreOtraSeccion} →
              </T>
            </Pressable>
          )}
        </View>
      ) : null}

      {/* 3. PRODUCTOS POR LOCAL DE LA SECCIÓN ACTIVA */}
      {porLocal.map((g) => (
        <View key={g.localId} style={styles.localBloque}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <T style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>{g.local}</T>
              <T v="chico" tenue>{g.ubicacion}</T>
            </View>
            <T style={{ fontFamily: F.datoMedio, fontSize: 15 }}>{bs(g.subtotal)}</T>
          </View>
          {g.items.map((i) => (
            <View key={claveItem(i)} style={styles.itemFila}>
              <T style={{ flex: 1, fontFamily: F.texto, fontSize: 14 }}>
                {i.nombre}
                {i.varianteDetalle ? ` · ${i.varianteDetalle}` : ''}
                {i.dropId ? ' · precio Drop' : ''}
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Disminuir ${i.nombre}`}
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  cambiar(claveItem(i), i.cantidad - 1);
                }}
                hitSlop={10}
                style={styles.stepperBoton}
              >
                <T style={styles.stepperSimbolo}>−</T>
              </Pressable>
              <T style={{ fontFamily: F.datoMedio, minWidth: 20, textAlign: 'center', fontSize: 15 }}>
                {i.cantidad}
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Aumentar ${i.nombre}`}
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  cambiar(claveItem(i), i.cantidad + 1);
                }}
                hitSlop={10}
                style={styles.stepperBoton}
              >
                <T style={styles.stepperSimbolo}>+</T>
              </Pressable>
            </View>
          ))}
        </View>
      ))}

      {/* 4. SUBTOTAL / TOTAL GENERAL DE LA SECCIÓN ACTIVA */}
      {items.length > 0 && (
        <>
          <View style={styles.totalRow}>
            <T v="senal" tenue style={styles.totalEtiqueta}>Total</T>
            <T
              style={styles.totalMonto}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {bs(total)}
            </T>
          </View>
          <T v="chico" oro style={styles.totalPuntos}>
            Sumas {Math.floor(total)} pts al retirar. Cada local te entrega su parte con su propio código.
          </T>

          {/* Lógica específica de la sección */}
          {tipo === 'retail' ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <T v="senal" tenue>Fecha estimada de llegada</T>
              <Segmentado
                opciones={[
                  { valor: '0', texto: 'Hoy' },
                  { valor: '1', texto: 'Mañana' },
                  { valor: '2', texto: 'Pasado mañana' },
                ]}
                valor={String(dia)}
                onCambio={(v) => setDia(Number(v))}
              />
            </View>
          ) : (
            <T v="chico" tenue style={{ marginTop: 4 }}>
              El restaurante recibe tu pedido ahora y te avisa cuando esté listo para recoger.
            </T>
          )}

          {/* 5. UN SOLO MÉTODO DE PAGO INFORMATIVO "EN EL LOCAL AL RETIRAR" */}
          <View style={styles.bloquePago}>
            <View style={styles.bloquePagoIcono}>
              <Ionicons name="storefront-outline" size={22} color={C.tinta} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={styles.bloquePagoTitulo}>Pago en el local al retirar</T>
              <T style={styles.bloquePagoSubtitulo}>Pagas cuando recojas tu pedido en la tienda</T>
            </View>
          </View>

          <Aviso texto={a.error} tipo="error" />

          {/* 6. BOTÓN "REALIZAR PEDIDO" */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${tipo === 'comida' ? 'Realizar Pedido' : 'Confirmar Reserva o Pedido'} por ${bs(total)}`}
            disabled={!cargado || !items.length || a.enviando}
            onPress={() => void confirmar()}
            style={({ pressed }) => [
              styles.btnRealizarPedido,
              (!cargado || !items.length) && styles.btnDeshabilitado,
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            {a.enviando ? (
              <ActivityIndicator color={C.papel} />
            ) : (
              <T style={styles.btnRealizarPedidoTexto}>
                {tipo === 'comida' ? 'Realizar Pedido' : 'Confirmar Reserva / Pedido'} · {bs(total)}
              </T>
            )}
          </Pressable>

          {/* 7. AVISO DISCRETO SI TIENE PRODUCTOS EN LA OTRA SECCIÓN */}
          {otraCantidad > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver productos en ${nombreOtraSeccion}`}
              onPress={() => cambiarSeccion(otraSeccion)}
              style={({ pressed }) => [styles.avisoOtraSeccionFooter, pressed && { opacity: 0.75 }]}
            >
              <Ionicons
                name={seccion === 'food' ? 'pricetag-outline' : 'restaurant-outline'}
                size={18}
                color={C.grafito}
              />
              <T style={styles.avisoOtraSeccionFooterTexto}>
                También tienes <T style={{ fontFamily: 'Inter_600SemiBold', color: C.tinta }}>{otraCantidad}</T>{' '}
                {otraCantidad === 1 ? 'producto' : 'productos'} en {nombreOtraSeccion}
              </T>
              <T style={styles.avisoOtraSeccionFooterLink}>Ver →</T>
            </Pressable>
          )}
        </>
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  navBackButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: C.veladura,
    borderRadius: 99,
    padding: 4,
    borderWidth: 1,
    borderColor: C.linea,
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActivo: {
    backgroundColor: C.tinta,
    shadowColor: C.tinta,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtnInactivo: {
    backgroundColor: 'transparent',
  },
  toggleBtnAtenuado: {
    opacity: 0.65,
  },
  toggleTexto: {
    fontFamily: F.senal,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  toggleTextoActivo: {
    color: C.papel,
  },
  toggleTextoInactivo: {
    color: C.grafito,
  },
  localBloque: {
    borderTopWidth: 1,
    borderTopColor: C.lineaFuerte,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  itemFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  stepperBoton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.veladura,
    borderWidth: 1,
    borderColor: C.linea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSimbolo: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: C.tinta,
    lineHeight: 20,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: C.tinta,
    paddingTop: 16,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    overflow: 'visible',
  },
  totalEtiqueta: {
    paddingBottom: 4,
  },
  totalMonto: {
    fontFamily: F.display,
    fontSize: 34,
    lineHeight: 46, // ~1.35x fontSize para evitar recorte en fuentes serif
    paddingVertical: 6,
    includeFontPadding: true, // fix para Android
    color: C.tinta,
    textAlign: 'right',
    flex: 1,
    overflow: 'visible',
  },
  totalPuntos: {
    marginTop: 2,
    marginBottom: 8,
  },
  bloquePago: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.veladura,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.linea,
    marginTop: 8,
  },
  bloquePagoIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.papel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.linea,
  },
  bloquePagoTitulo: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: C.tinta,
  },
  bloquePagoSubtitulo: {
    fontFamily: F.texto,
    fontSize: 13,
    color: C.grafito,
    lineHeight: 18,
  },
  btnRealizarPedido: {
    minHeight: 52,
    paddingHorizontal: 24,
    borderRadius: 99,
    backgroundColor: C.tinta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    shadowColor: C.tinta,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  btnRealizarPedidoTexto: {
    fontFamily: F.senal,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.papel,
  },
  btnDeshabilitado: {
    opacity: 0.4,
  },
  vacioCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: C.veladura,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.linea,
    gap: 12,
    marginTop: 8,
  },
  vacioIconoContenedor: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.papel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: C.tinta,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  vacioTitulo: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: C.tinta,
    textAlign: 'center',
  },
  vacioSubtitulo: {
    fontFamily: F.texto,
    fontSize: 14,
    color: C.grafito,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  vacioAcciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    justifyContent: 'center',
  },
  btnPildoraPrincipal: {
    backgroundColor: C.tinta,
    borderRadius: 99,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: C.tinta,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  btnPildoraPrincipalTexto: {
    fontFamily: F.senal,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.papel,
  },
  btnPildoraSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.papel,
    borderWidth: 1,
    borderColor: C.lineaFuerte,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  btnPildoraSecundarioTexto: {
    fontFamily: F.senal,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.tinta,
  },
  avisoCambioSeccion: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  avisoCambioSeccionTexto: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: C.oro,
    textAlign: 'center',
  },
  avisoOtraSeccionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.veladura,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: C.linea,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    minHeight: 44,
  },
  avisoOtraSeccionFooterTexto: {
    fontFamily: F.texto,
    fontSize: 13,
    color: C.grafito,
  },
  avisoOtraSeccionFooterLink: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: C.tinta,
  },
});
