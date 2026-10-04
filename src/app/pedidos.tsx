import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OrderStatusChip } from '@/components/order-status-chip';
import { Cargando, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { bs, fechaHora, useDatos } from '@/lib/datos';

export default function Pedidos() {
  const router = useRouter();
  const { datos, error, cargando, recargar } = useDatos<any[]>('/cliente/pedidos');

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Stack.Screen
        options={{
          title: 'Mis pedidos',
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

      {cargando && !datos ? (
        <View style={styles.centerContainer}>
          <Cargando />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={44} color={C.alerta} />
          <T style={styles.errorTitulo}>No se pudieron cargar tus pedidos</T>
          <T style={styles.errorSubtitulo}>{error}</T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reintentar"
            onPress={() => void recargar()}
            style={({ pressed }) => [styles.btnReintentar, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <T style={styles.btnReintentarTexto}>Reintentar</T>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={datos ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={cargando}
              onRefresh={() => void recargar()}
              tintColor={C.oroBrillo}
              colors={[C.oroBrillo]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item: p }) => {
            const estado = getEstadoPedido(p);
            const locales = p.subpedidos?.map((s: any) => s.local) ?? [];
            const textoLocal = locales.length > 1
              ? `${locales[0]} +${locales.length - 1} más`
              : locales[0] ?? 'PaseoYa';

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver pedido ${p.codigo}`}
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/pedido/${p.id}`);
                }}
                style={({ pressed }) => [
                  styles.card,
                  pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
                ]}
              >
                {/* Fila superior: Código a la izquierda y chip de estado a la derecha */}
                <View style={styles.cardHeader}>
                  <T style={styles.codigoTexto}>{p.codigo}</T>
                  <OrderStatusChip estado={estado} />
                </View>

                {/* Segunda línea: Nombre del local y fecha/hora */}
                <T style={styles.localFechaTexto} numberOfLines={1}>
                  {textoLocal} · {fechaHora(p.creado_en)}
                </T>

                {/* Fila inferior: Monto total y botón "Ver pedido" */}
                <View style={styles.cardFooter}>
                  <T style={styles.montoTexto}>{bs(p.total_bs)}</T>
                  <View style={styles.btnVerPedido}>
                    <T style={styles.btnVerPedidoTexto}>Ver pedido</T>
                    <Ionicons name="arrow-forward" size={13} color={C.tinta} />
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.vacioContainer}>
              <View style={styles.vacioIconoContenedor}>
                <Ionicons name="bag-handle-outline" size={44} color={C.grafito} />
              </View>
              <T style={styles.vacioTitulo}>Aún no tienes pedidos</T>
              <T style={styles.vacioSubtitulo}>
                Tus compras en PaseoFood y PaseoShop aparecerán aquí para que hagas seguimiento en tiempo real.
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ir al inicio de PaseoYa"
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/paseoya');
                }}
                style={({ pressed }) => [styles.btnIrInicio, pressed && { transform: [{ scale: 0.97 }] }]}
              >
                <T style={styles.btnIrInicioTexto}>Explorar PaseoYa</T>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function getEstadoPedido(p: any): string {
  const estados: string[] = p.subpedidos?.map((s: any) => s.estado) ?? [];
  if (estados.includes('cliente_llego')) return 'cliente_llego';
  if (estados.includes('listo')) return 'listo';
  if (estados.includes('preparando')) return 'preparando';
  if (estados.includes('confirmado')) return 'confirmado';
  if (estados.includes('recibido')) return 'recibido';
  if (estados.length > 0 && estados.every((e) => e === 'entregado')) return 'entregado';
  if (estados.length > 0 && estados.every((e) => e === 'vencido' || e === 'cancelado')) return 'vencido';
  return estados[0] ?? 'recibido';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.papel,
  },
  backBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: C.papel,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.linea,
    shadowColor: C.tinta,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codigoTexto: {
    fontFamily: F.datoMedio,
    fontSize: 16,
    color: C.tinta,
    letterSpacing: 0.5,
  },
  localFechaTexto: {
    fontFamily: F.texto,
    fontSize: 13,
    color: C.grafito,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.veladura,
  },
  montoTexto: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: C.tinta,
  },
  btnVerPedido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: C.veladura,
    borderWidth: 1,
    borderColor: C.linea,
    minHeight: 44,
  },
  btnVerPedidoTexto: {
    fontFamily: F.senal,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.tinta,
  },
  vacioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  vacioIconoContenedor: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.veladura,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
  btnIrInicio: {
    backgroundColor: C.tinta,
    borderRadius: 99,
    paddingHorizontal: 22,
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
  btnIrInicioTexto: {
    fontFamily: F.senal,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.papel,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  errorTitulo: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: C.alerta,
    textAlign: 'center',
  },
  errorSubtitulo: {
    fontFamily: F.texto,
    fontSize: 13,
    color: C.grafito,
    textAlign: 'center',
  },
  btnReintentar: {
    backgroundColor: C.veladura,
    borderWidth: 1,
    borderColor: C.lineaFuerte,
    borderRadius: 99,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnReintentarTexto: {
    fontFamily: F.senal,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.tinta,
  },
});
