import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IrA, Segmentado, T, Vacio } from '@/components/ui';
import { C } from '@/constants/theme';
import { api, urlArchivo } from '@/lib/api';
import { useCarrito } from '@/lib/carrito';
import { bs, useDatos } from '@/lib/datos';
import { Business, Promotion, useBusinesses, usePromotions } from '@/lib/paseoya-servicio';

export default function Buscar() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ section?: 'food' | 'shop'; local?: string }>();
  const { local } = params;

  // La sección queda determinada ÚNICAMENTE por el parámetro recibido desde Home ('food' | 'shop')
  const section: 'food' | 'shop' = params.section === 'shop' ? 'shop' : 'food';
  const cartTipo = section === 'food' ? 'comida' : 'retail';

  // Consumo de datos reales desde la base de datos a través de hooks desacoplados
  const { data: businesses, loading: loadingBusinesses } = useBusinesses(section);
  const { data: promotions, loading: loadingPromotions } = usePromotions(section);

  const { datos: productosLocal } = useDatos<any[]>(local ? `/paseoya/productos?local=${local}` : null);
  const carritos = useCarrito();
  const { items } = carritos[cartTipo];
  const totalCantidad = carritos.comida.cantidadTotal + carritos.retail.cantidadTotal;

  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<any[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [orden, setOrden] = useState<'precio' | 'nombre'>('precio');

  async function buscar(o = orden) {
    if (q.trim().length < 2) {
      setResultados(null);
      return;
    }
    setBuscando(true);
    try {
      const res = await api(`/paseoya/buscar?q=${encodeURIComponent(q)}&orden=${o}`);
      setResultados(Array.isArray(res) ? res : []);
    } catch {
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }

  const listaFiltrada = (resultados ?? (local ? productosLocal : null))?.filter(
    (p) => (section === 'food' ? p.ambito === 'comida' : p.ambito === 'tiendas'),
  );

  const Header = (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      {!resultados && (
        <>
          {/* Promociones: justo debajo del buscador con espaciado limpio */}
          {loadingPromotions && promotions.length === 0 ? (
            <View style={{ height: (width * 0.85) / 2.2, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={C.oro} />
            </View>
          ) : promotions.length > 0 ? (
            <View>
              <T style={{ fontFamily: 'Montserrat_700Bold', fontSize: 18, color: C.tinta, marginBottom: 12 }}>
                Promociones
              </T>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={width * 0.85 + 14}
                decelerationRate="fast"
                contentContainerStyle={{ gap: 14, paddingRight: width * 0.15 }}
              >
                {promotions.map((promo) => (
                  <PromoSlide key={promo.id} promo={promo} width={width} section={section} />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Título de la sección de negocios */}
          <T style={{ fontFamily: 'Montserrat_700Bold', fontSize: 20, color: C.tinta, marginTop: 8 }}>
            {section === 'food' ? 'Restaurantes' : 'Tiendas'}
          </T>
        </>
      )}

      {resultados && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
          <T v="senal" tenue>{listaFiltrada?.length ?? 0} resultados</T>
          <Segmentado
            opciones={[
              { valor: 'precio', texto: 'Precio' },
              { valor: 'nombre', texto: 'Nombre' },
            ]}
            valor={orden}
            onCambio={(o) => {
              setOrden(o);
              void buscar(o);
            }}
          />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. BARRA SUPERIOR FIJA (Flecha · Buscador · Carrito) */}
      <View style={styles.searchHeader}>
        {/* Flecha de volver al Home con tamaño táctil mínimo 48x48 */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={C.tinta} />
        </Pressable>

        {/* Campo de búsqueda */}
        <View style={styles.inputContainer}>
          <Ionicons name="search-outline" size={20} color={C.grafito} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder={section === 'food' ? 'Busca restaurantes, comida...' : 'Busca tiendas, productos...'}
            value={q}
            onChangeText={(text) => {
              setQ(text);
              if (text.length === 0) setResultados(null);
            }}
            onSubmitEditing={() => void buscar()}
            returnKeyType="search"
            placeholderTextColor={C.grafito}
            // @ts-ignore
            outlineStyle="none"
          />
          {buscando ? (
            <ActivityIndicator size="small" color={C.oro} style={{ marginLeft: 6 }} />
          ) : q.length > 0 ? (
            <Pressable
              onPress={() => {
                setQ('');
                setResultados(null);
              }}
              hitSlop={10}
              style={styles.clearButton}
              accessibilityLabel="Limpiar búsqueda"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={18} color={C.grafito} />
            </Pressable>
          ) : null}
        </View>

        {/* Botón de Carrito */}
        <Pressable
          onPress={() => router.push(`/carrito?section=${section}&tipo=${cartTipo}`)}
          hitSlop={10}
          style={({ pressed }) => [styles.cartButton, pressed && { opacity: 0.6 }]}
          accessibilityLabel={`Carrito, ${totalCantidad} productos`}
          accessibilityRole="button"
        >
          <Ionicons name="cart-outline" size={24} color={C.tinta} />
          {totalCantidad > 0 && (
            <View style={styles.cartBadge}>
              <T style={styles.cartBadgeText}>{totalCantidad > 99 ? '99+' : totalCantidad}</T>
            </View>
          )}
        </Pressable>
      </View>

      {/* 2. CONTENIDO SCROLLABLE (Header + Negocios o Resultados) */}
      {loadingBusinesses && !resultados ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.oro} />
        </View>
      ) : (
        <FlatList
          data={resultados ? listaFiltrada : businesses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={Header}
          renderItem={({ item }) =>
            resultados ? <ProductoFila p={item} /> : <BusinessCard b={item} section={section} />
          }
          ListEmptyComponent={
            <Vacio
              texto={
                resultados
                  ? `No encontramos «${q}». Registramos tu búsqueda para que el Paseo sepa que hace falta.`
                  : 'Sin negocios disponibles en esta sección.'
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

/** Slide del carrusel de promociones con imagen cover y chip de título */
function PromoSlide({ promo, width, section }: { promo: Promotion; width: number; section: 'food' | 'shop' }) {
  const slideWidth = width * 0.85;
  const slideHeight = slideWidth / 2.1;

  return (
    <View style={[styles.promoCard, { width: slideWidth, height: slideHeight }]}>
      {promo.imagen ? (
        <Image
          source={{ uri: promo.imagen }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={250}
        />
      ) : (
        <View style={styles.promoPlaceholder}>
          <Ionicons
            name={section === 'food' ? 'restaurant-outline' : 'pricetag-outline'}
            size={40}
            color={C.oro}
          />
        </View>
      )}

      {/* Chip con título en la parte inferior izquierda */}
      <View style={styles.promoChipContainer}>
        <T style={styles.promoChipText} numberOfLines={1}>
          {promo.titulo}
        </T>
      </View>
    </View>
  );
}

/** Tarjeta de Negocio para el listado */
function BusinessCard({ b, section }: { b: Business; section: 'food' | 'shop' }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => {
        router.push(`/tienda/${b.id}?section=${section}` as any);
      }}
      style={({ pressed }) => [styles.businessCard, pressed && { transform: [{ scale: 0.985 }] }]}
    >
      {/* Imagen cuadrada de 96 dp con cover */}
      <View style={styles.businessImageContainer}>
        {b.imagen ? (
          <Image
            source={{ uri: b.imagen }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.businessPlaceholder}>
            <Ionicons
              name={section === 'food' ? 'restaurant-outline' : 'storefront-outline'}
              size={36}
              color={C.grafito}
            />
          </View>
        )}
      </View>

      {/* Información del local */}
      <View style={styles.businessInfo}>
        <T style={styles.businessTitle} numberOfLines={1}>
          {b.nombre}
        </T>
        {b.descripcion ? (
          <T style={styles.businessDescription} numberOfLines={2}>
            {b.descripcion}
          </T>
        ) : null}

        {/* Chip de piso con ícono vectorial de ubicación */}
        {b.piso ? (
          <View style={styles.floorContainer}>
            <Ionicons name="location-outline" size={13} color={C.grafito} />
            <T style={styles.floorText}>{b.piso}</T>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Fila para Resultados de Búsqueda de Productos */
function ProductoFila({ p }: { p: any }) {
  return (
    <IrA
      href={`/producto/${p.id}`}
      estilo={styles.productRow}
    >
      <View style={styles.productImageContainer}>
        {p.foto_url ? (
          <Image
            source={{ uri: urlArchivo(p.foto_url)! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <View style={styles.productPlaceholder}>
            <Ionicons name="cube-outline" size={24} color={C.grafito} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.tinta }}>{p.nombre}</T>
        <T v="chico" tenue>
          {[p.local, p.piso, p.numero_local ? `Local ${p.numero_local}` : null, p.stock <= 3 ? `quedan ${p.stock}` : null]
            .filter(Boolean)
            .join(' · ')}
        </T>
      </View>
      <T v="subtitulo" style={{ fontSize: 16 }}>{bs(p.precio_bs)}</T>
    </IrA>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.papel,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: C.papel,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.linea,
    zIndex: 10,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.veladura,
    borderRadius: 99,
    paddingHorizontal: 14,
    height: 44,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: C.tinta,
    minHeight: 44,
  },
  clearButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 6,
    right: 4,
    backgroundColor: C.tinta,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: C.papel,
  },
  cartBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    color: C.papel,
    fontSize: 9,
    lineHeight: 11,
  },
  listContent: {
    padding: 16,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: C.veladura,
    shadowColor: C.tinta,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  promoPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: C.veladura,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoChipContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  promoChipText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: C.tinta,
  },
  businessCard: {
    flexDirection: 'row',
    gap: 16,
    padding: 14,
    marginBottom: 14,
    backgroundColor: C.papel,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.linea,
    shadowColor: C.tinta,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  businessImageContainer: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.veladura,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: C.veladura,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  businessTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: C.tinta,
  },
  businessDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: C.grafito,
    lineHeight: 18,
  },
  floorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  floorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: C.grafito,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.linea,
    alignItems: 'center',
  },
  productImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: C.veladura,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: C.veladura,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
