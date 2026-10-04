import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cargando, IrA, T, Vacio } from '@/components/ui';
import { C } from '@/constants/theme';
import { urlArchivo } from '@/lib/api';
import { useCarrito } from '@/lib/carrito';
import { bs, useDatos } from '@/lib/datos';

interface PromocionLocal {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  costo_puntos?: number | null;
}

interface DetalleLocal {
  id: string;
  nombre: string;
  descripcion: string;
  piso: string | null;
  sector: string | null;
  numero_local: string | null;
  horario_apertura: string | null;
  horario_cierre: string | null;
  foto_url: string | null;
  banner_url: string | null;
  fotos: string[];
  activo: boolean;
  categoria: string;
  ambito: string;
  promociones?: PromocionLocal[];
}

export default function TiendaDetalle() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id, section } = useLocalSearchParams<{ id: string; section?: 'food' | 'shop' }>();

  const { datos: tienda, cargando: cargandoTienda } = useDatos<DetalleLocal>(`/paseoya/locales/${id}`);
  const { datos: productos, cargando: cargandoProductos } = useDatos<any[]>(`/paseoya/productos?local=${id}`);

  const tipoCarrito = (section === 'shop' || tienda?.ambito === 'tiendas') ? 'retail' : 'comida';
  const carritos = useCarrito();
  const { items } = carritos[tipoCarrito];
  const totalCantidad = carritos.comida.cantidadTotal + carritos.retail.cantidadTotal;

  const [indiceFoto, setIndiceFoto] = useState(0);

  if (cargandoTienda && !tienda) {
    return <Cargando />;
  }

  if (!tienda) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.navButton} accessibilityLabel="Volver" accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={C.tinta} />
          </Pressable>
        </View>
        <Vacio texto="No se encontró información de este comercio." />
      </SafeAreaView>
    );
  }

  // Galería de fotos (si tiene múltiples, o portada única)
  const fotosGaleria: string[] = Array.isArray(tienda.fotos) && tienda.fotos.length > 0
    ? tienda.fotos.map((f) => urlArchivo(f)!).filter(Boolean)
    : (tienda.foto_url ? [urlArchivo(tienda.foto_url)!] : []);

  const promociones = tienda.promociones ?? [];

  // Formato amigable de piso
  let pisoLabel = tienda.piso;
  if (pisoLabel === 'T' || pisoLabel?.toLowerCase() === 'pb') pisoLabel = 'Planta Baja';
  else if (pisoLabel && pisoLabel.startsWith('N')) pisoLabel = `Piso ${pisoLabel.slice(1)}`;

  const onScrollGaleria = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const nuevoIndice = Math.round(x / width);
    if (nuevoIndice !== indiceFoto) {
      setIndiceFoto(nuevoIndice);
    }
  };

  const Header = (
    <View style={{ gap: 20 }}>
      {/* 1. Carrusel de Fotos Superior o Imagen Única */}
      <View style={styles.galleryContainer}>
        {fotosGaleria.length > 0 ? (
          <View style={{ width, height: 260 }}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollGaleria}
              decelerationRate="fast"
            >
              {fotosGaleria.map((uri, idx) => (
                <View key={idx} style={{ width, height: 260 }}>
                  <Image
                    source={{ uri }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={200}
                  />
                </View>
              ))}
            </ScrollView>

            {/* Paginador si tiene más de 1 imagen */}
            {fotosGaleria.length > 1 && (
              <View style={styles.paginationDots}>
                {fotosGaleria.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx === indiceFoto ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.imagePlaceholder, { width, height: 200 }]}>
            <Ionicons
              name={tienda.ambito === 'comida' ? 'restaurant-outline' : 'storefront-outline'}
              size={56}
              color={C.grafito}
            />
          </View>
        )}
      </View>

      {/* 2. Título, Tags y Descripción de la Tienda */}
      <View style={styles.infoSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <View style={styles.badgeCategoria}>
            <T style={styles.badgeCategoriaText}>{tienda.categoria}</T>
          </View>
          {pisoLabel ? (
            <View style={styles.chipMeta}>
              <Ionicons name="location-outline" size={14} color={C.grafito} />
              <T style={styles.chipMetaText}>
                {pisoLabel} {tienda.numero_local ? `· Local ${tienda.numero_local}` : ''}
              </T>
            </View>
          ) : null}
          {tienda.horario_apertura && tienda.horario_cierre ? (
            <View style={styles.chipMeta}>
              <Ionicons name="time-outline" size={14} color={C.grafito} />
              <T style={styles.chipMetaText}>
                {String(tienda.horario_apertura).slice(0, 5)} - {String(tienda.horario_cierre).slice(0, 5)}
              </T>
            </View>
          ) : null}
        </View>

        <T style={styles.tiendaTitulo}>{tienda.nombre}</T>

        {tienda.descripcion ? (
          <T style={styles.tiendaDescripcion}>{tienda.descripcion}</T>
        ) : null}
      </View>

      {/* 3. Apartado de Promociones con Carrusel */}
      {promociones.length > 0 && (
        <View style={styles.promosSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Ionicons name="sparkles" size={18} color={C.oro} />
            <T style={styles.sectionTitle}>Promociones especiales</T>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
          >
            {promociones.map((p) => (
              <View key={p.id} style={[styles.promoCard, { width: width * 0.72 }]}>
                <View style={styles.promoHeader}>
                  <Ionicons
                    name={p.tipo === 'puntos_dobles' ? 'star' : 'pricetag'}
                    size={16}
                    color={C.oro}
                  />
                  <T style={styles.promoTipo}>
                    {p.tipo === 'puntos_dobles' ? 'PUNTOS DOBLES' : 'BENEFICIO'}
                  </T>
                </View>
                <T style={styles.promoTitulo} numberOfLines={2}>{p.titulo}</T>
                {p.descripcion ? (
                  <T style={styles.promoDescripcion} numberOfLines={2}>{p.descripcion}</T>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 4. Título del catálogo de productos */}
      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        <T style={styles.sectionTitle}>Productos</T>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Barra de navegación superior flotante */}
      <View style={styles.navBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.7 }]}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={C.tinta} />
        </Pressable>

        <T style={styles.navTitle} numberOfLines={1}>
          {tienda.nombre}
        </T>

        <Pressable
          onPress={() => router.push(`/carrito?section=${section || (tipoCarrito === 'retail' ? 'shop' : 'food')}&tipo=${tipoCarrito}`)}
          hitSlop={10}
          style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.7 }]}
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

      {/* Lista Principal de Productos */}
      {cargandoProductos ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.oro} />
        </View>
      ) : (
        <FlatList
          data={productos ?? []}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <ProductoCard p={item} />}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 20, paddingVertical: 32 }}>
              <Vacio texto="Este comercio no tiene productos disponibles en este momento." />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

/** Tarjeta individual de producto para la lista de la tienda */
function ProductoCard({ p }: { p: any }) {
  const fotoUri = p.foto_url ? urlArchivo(p.foto_url) : null;

  return (
    <IrA href={`/producto/${p.id}`} estilo={styles.productoRow}>
      <View style={styles.productoImageContainer}>
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={styles.productoPlaceholder}>
            <Ionicons name="cube-outline" size={26} color={C.grafito} />
          </View>
        )}
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <T style={styles.productoNombre} numberOfLines={2}>
          {p.nombre}
        </T>
        {p.descripcion ? (
          <T style={styles.productoDescripcion} numberOfLines={2}>
            {p.descripcion}
          </T>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <T style={styles.productoPrecio}>{bs(p.precio_bs)}</T>
          {p.stock <= 3 && p.stock > 0 ? (
            <T v="chico" style={{ color: C.alerta }}>Quedan {p.stock}</T>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={C.grafito} style={{ alignSelf: 'center' }} />
    </IrA>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.papel,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.linea,
    backgroundColor: C.papel,
    zIndex: 10,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: C.tinta,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: C.alerta,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  listContent: {
    paddingBottom: 40,
  },
  galleryContainer: {
    backgroundColor: C.veladura,
    position: 'relative',
  },
  imagePlaceholder: {
    backgroundColor: C.veladura,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#FFF',
    width: 20,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  infoSection: {
    paddingHorizontal: 20,
    gap: 8,
  },
  badgeCategoria: {
    backgroundColor: C.veladura,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeCategoriaText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: C.tinta,
    textTransform: 'uppercase',
  },
  chipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.papel,
    borderWidth: 1,
    borderColor: C.linea,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipMetaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: C.grafito,
  },
  tiendaTitulo: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 26,
    color: C.tinta,
    marginTop: 4,
  },
  tiendaDescripcion: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: C.grafito,
  },
  promosSection: {
    paddingLeft: 20,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: C.tinta,
  },
  promoCard: {
    backgroundColor: '#FFF8EB',
    borderWidth: 1,
    borderColor: '#F3E5C7',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promoTipo: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: C.oro,
    letterSpacing: 0.5,
  },
  promoTitulo: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: C.tinta,
  },
  promoDescripcion: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: C.grafito,
  },
  productoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.linea,
  },
  productoImageContainer: {
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: C.veladura,
  },
  productoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productoNombre: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: C.tinta,
  },
  productoDescripcion: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: C.grafito,
  },
  productoPrecio: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: C.tinta,
  },
});
