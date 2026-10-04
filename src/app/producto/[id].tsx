import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, Cargando, Etiqueta, T } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { api, urlArchivo } from '@/lib/api';
import { useCarrito } from '@/lib/carrito';
import { bs, ubicacion, useDatos } from '@/lib/datos';

export default function Producto() {
  const { id, drop } = useLocalSearchParams<{ id: string; drop?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const carritos = useCarrito();
  const totalCantidad = carritos.comida.cantidadTotal + carritos.retail.cantidadTotal;

  const [seleccion, setSeleccion] = useState<Record<string, string>>({});
  const [fotoVariante, setFotoVariante] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [guardandoFavorito, setGuardandoFavorito] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { datos: p, setDatos, cargando } = useDatos<any>(`/paseoya/productos/${id}`);
  const { datos: drops } = useDatos<any[]>(drop ? '/cliente/drops' : null);

  if (cargando && !p) return <Cargando />;
  if (!p) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.navButton} accessibilityLabel="Volver" accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={C.tinta} />
          </Pressable>
        </View>
        <View style={{ padding: 24, alignItems: 'center' }}>
          <T tenue>No se encontró el producto.</T>
        </View>
      </SafeAreaView>
    );
  }

  const d = drops?.find((x) => x.drop_id === drop);
  const tipo = p.ambito === 'comida' ? 'comida' : 'retail';
  const carrito = carritos[tipo];
  const { items } = carrito;

  const grupos = p.variantes ?? [];
  const opciones = grupos.flatMap((g: any) => g.opciones.filter((v: any) => seleccion[g.id] === v.id));
  const completo = grupos.every((g: any) => opciones.some((v: any) => v.grupo_id === g.id));
  const precioUnitario = Math.round(
    ((d ? Number(d.precio_especial) : Number(p.precio_bs)) +
      opciones.reduce((s: number, v: any) => s + (v.precio_bs == null ? 0 : Number(v.precio_bs) - Number(p.precio_bs)), 0)) *
      100,
  ) / 100;
  const stock = grupos.length ? (opciones.length ? Math.min(...opciones.map((v: any) => v.stock)) : 0) : p.stock;
  const foto = fotoVariante ?? p.foto_url;
  const fotoUri = foto ? urlArchivo(foto) : null;
  const totalBs = Math.round(precioUnitario * cantidad * 100) / 100;

  const decrementar = () => {
    if (cantidad > 1) setCantidad((c) => c - 1);
  };

  const incrementar = () => {
    if (cantidad < (stock > 0 ? Math.min(stock, 20) : 1)) {
      setCantidad((c) => c + 1);
    }
  };

  const alternarFavorito = async () => {
    setGuardandoFavorito(true);
    try {
      const r = await api('/cliente/favoritos', { cuerpo: { productoId: p.id } });
      setDatos({ ...p, favorito: r.favorito });
    } catch {
      // Manejo silencioso de fallo
    } finally {
      setGuardandoFavorito(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 1. BARRA SUPERIOR FIJA (Flecha atrás · Nombre o vacío · Carrito con badge) */}
      <View style={styles.navBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.6 }]}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={C.tinta} />
        </Pressable>

        <T style={styles.navTitle} numberOfLines={1}>
          {p.local || 'Detalle del producto'}
        </T>

        <Pressable
          onPress={() => router.push(`/carrito?section=${p.ambito === 'tiendas' ? 'shop' : 'food'}&tipo=${tipo}`)}
          hitSlop={10}
          style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.6 }]}
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

      {/* 2. CONTENIDO PRINCIPAL SCROLLABLE */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Imagen en la parte superior */}
        <View style={[styles.imageContainer, { width }]}>
          {fotoUri ? (
            <Image
              source={{ uri: fotoUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name={p.ambito === 'comida' ? 'fast-food-outline' : 'cube-outline'}
                size={64}
                color={C.grafito}
              />
            </View>
          )}
        </View>

        {/* Información del producto */}
        <View style={styles.body}>
          {/* Categoría y badges */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <View style={styles.badgeCategoria}>
              <T style={styles.badgeCategoriaText}>{p.categoria}</T>
            </View>
            {d && <Etiqueta texto="Precio Drop" tono="oro" />}
          </View>

          {/* Título del producto */}
          <T style={styles.titulo}>{p.nombre}</T>

          {/* Descripción */}
          {p.descripcion ? <T style={styles.descripcion}>{p.descripcion}</T> : null}

          {/* Precio y puntos */}
          <View style={styles.precioRow}>
            <T style={styles.precioGrande}>{bs(precioUnitario)}</T>
            {d && <T tenue style={styles.precioTachado}>{bs(p.precio_bs)}</T>}
          </View>

          <View style={styles.puntosCard}>
            <Ionicons name="sparkles" size={16} color={C.oro} />
            <T style={styles.puntosText}>
              Ganas <T style={{ fontFamily: 'Montserrat_700Bold', color: C.oro }}>{Math.floor(totalBs)} puntos</T> Paseo Points al retirar
            </T>
          </View>

          {/* Comercio y ubicación */}
          <View style={styles.comercioCard}>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={styles.comercioNombre}>{p.local}</T>
              <T v="chico" tenue>
                {ubicacion(p)} · Retiro de {String(p.horario_apertura ?? '10:00').slice(0, 5)} a {String(p.horario_cierre ?? '22:00').slice(0, 5)}
              </T>
            </View>
            <View style={styles.stockBadge}>
              <T v="chico" style={{ color: stock > 0 ? C.tinta : C.alerta, fontFamily: 'Inter_500Medium' }}>
                {!completo ? 'Elige opciones' : stock > 0 ? `${stock} disponibles` : 'Agotado'}
              </T>
            </View>
          </View>

          {/* Variantes del Producto (con chips modernos) */}
          {grupos.map((g: any) => (
            <View key={g.id} style={styles.grupoVariante}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T style={styles.grupoTitulo}>{g.titulo}</T>
                <T v="chico" style={{ color: C.alerta }}>Obligatorio</T>
              </View>

              <View style={styles.chipsContainer}>
                {g.opciones.map((v: any) => {
                  const seleccionada = seleccion[g.id] === v.id;
                  const sinStock = v.stock <= 0;
                  const difPrecio = v.precio_bs != null ? Number(v.precio_bs) - Number(p.precio_bs) : 0;

                  return (
                    <Pressable
                      key={v.id}
                      disabled={sinStock}
                      accessibilityRole="button"
                      accessibilityState={{ selected: seleccionada, disabled: sinStock }}
                      onPress={() => {
                        setSeleccion((x) => ({ ...x, [g.id]: v.id }));
                        setFotoVariante(v.foto_url ?? null);
                        setMsg(null);
                      }}
                      style={({ pressed }) => [
                        styles.chipPildora,
                        seleccionada && styles.chipPildoraActivo,
                        sinStock && styles.chipPildoraDeshabilitado,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <T
                        style={[
                          styles.chipTexto,
                          seleccionada && styles.chipTextoActivo,
                          sinStock && styles.chipTextoDeshabilitado,
                        ]}
                      >
                        {v.nombre}
                        {sinStock ? ' · Agotado' : difPrecio > 0 ? ` (+${bs(difPrecio)})` : ''}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Aviso de confirmación si agregó al carrito */}
          {msg && (
            <View style={{ marginTop: 8 }}>
              <Aviso texto={msg} tipo="exito" />
            </View>
          )}
        </View>
      </ScrollView>

      {/* 3. BARRA INFERIOR FIJA (Sticky Bottom Bar) */}
      <View style={styles.stickyBottomBar}>
        <View style={styles.bottomBarTopRow}>
          {/* Selector de Cantidad con botones [+] y [-] */}
          <View style={styles.stepperContainer}>
            <Pressable
              onPress={decrementar}
              disabled={cantidad <= 1}
              style={({ pressed }) => [
                styles.stepperButton,
                cantidad <= 1 && styles.stepperButtonDisabled,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityLabel="Disminuir cantidad"
              accessibilityRole="button"
            >
              <Ionicons name="remove" size={18} color={cantidad <= 1 ? C.lineaFuerte : C.tinta} />
            </Pressable>

            <View style={styles.stepperCountContainer}>
              <T style={styles.stepperCountText}>{cantidad}</T>
            </View>

            <Pressable
              onPress={incrementar}
              disabled={stock <= cantidad}
              style={({ pressed }) => [
                styles.stepperButton,
                stock <= cantidad && styles.stepperButtonDisabled,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityLabel="Aumentar cantidad"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={18} color={stock <= cantidad ? C.lineaFuerte : C.tinta} />
            </Pressable>
          </View>

          {/* Subtotal en vivo */}
          <View style={{ alignItems: 'flex-end' }}>
            <T v="chico" tenue>Total a pagar</T>
            <T style={styles.totalPrecioText}>{bs(totalBs)}</T>
          </View>
        </View>

        {/* Fila de Botones: [❤️ Favoritos] + [🛒 Agregar al carrito] */}
        <View style={styles.actionButtonsRow}>
          {/* Botón Favorito con ícono */}
          <Pressable
            onPress={alternarFavorito}
            disabled={guardandoFavorito}
            style={({ pressed }) => [
              styles.btnFavorito,
              p.favorito && styles.btnFavoritoActivo,
              pressed && { opacity: 0.75 },
            ]}
            accessibilityLabel={p.favorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            accessibilityRole="button"
          >
            {guardandoFavorito ? (
              <ActivityIndicator size="small" color={p.favorito ? C.alerta : C.tinta} />
            ) : (
              <Ionicons
                name={p.favorito ? 'heart' : 'heart-outline'}
                size={22}
                color={p.favorito ? C.alerta : C.tinta}
              />
            )}
          </Pressable>

          {/* Botón Agregar al carrito (Ancho y prominente) */}
          <Pressable
            disabled={!carrito.cargado || !completo || stock < cantidad || precioUnitario < 0}
            onPress={() => {
              carrito.agregar({
                productoId: p.id,
                nombre: p.nombre,
                precioBs: precioUnitario,
                cantidad,
                localId: p.local_id,
                local: p.local,
                ubicacion: ubicacion(p),
                dropId: d ? drop : null,
                varianteIds: opciones.map((v: any) => v.id),
                varianteDetalle: grupos
                  .map((g: any) => `${g.titulo}: ${opciones.find((v: any) => v.grupo_id === g.id)?.nombre}`)
                  .join(' | '),
                ambito: p.ambito,
                tipo,
              });
              setMsg(`¡Agregado al carrito de ${tipo}!`);
            }}
            style={({ pressed }) => [
              styles.btnAgregar,
              (!carrito.cargado || !completo || stock < cantidad) && styles.btnAgregarDeshabilitado,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Agregar ${cantidad} al carrito`}
          >
            <Ionicons name="cart" size={20} color={C.papel} />
            <T style={styles.btnAgregarTexto}>
              {!completo ? 'Elige tus opciones' : stock < cantidad ? 'Sin stock' : 'Agregar al carrito'}
            </T>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
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
    backgroundColor: C.papel,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.linea,
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
    fontSize: 16,
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
  scrollContent: {
    paddingBottom: 24,
  },
  imageContainer: {
    height: 280,
    backgroundColor: C.veladura,
    position: 'relative',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 20,
    gap: 14,
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
  titulo: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 26,
    color: C.tinta,
    lineHeight: 32,
  },
  descripcion: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: C.grafito,
  },
  precioRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  precioGrande: {
    fontFamily: F.display,
    fontSize: 34,
    color: C.tinta,
  },
  precioTachado: {
    textDecorationLine: 'line-through',
    fontSize: 16,
  },
  puntosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8EB',
    borderWidth: 1,
    borderColor: '#F3E5C7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  puntosText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: C.tinta,
  },
  comercioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.linea,
    gap: 12,
  },
  comercioNombre: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: C.tinta,
  },
  stockBadge: {
    backgroundColor: C.veladura,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  grupoVariante: {
    gap: 10,
    paddingTop: 6,
  },
  grupoTitulo: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: C.tinta,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipPildora: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: C.lineaFuerte,
    backgroundColor: 'transparent',
  },
  chipPildoraActivo: {
    backgroundColor: C.tinta,
    borderColor: C.tinta,
  },
  chipPildoraDeshabilitado: {
    opacity: 0.4,
    borderColor: C.linea,
  },
  chipTexto: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: C.tinta,
  },
  chipTextoActivo: {
    color: C.papel,
  },
  chipTextoDeshabilitado: {
    color: C.grafito,
  },
  stickyBottomBar: {
    backgroundColor: C.papel,
    borderTopWidth: 1,
    borderTopColor: C.linea,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomBarTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.veladura,
    borderRadius: 20,
    padding: 3,
  },
  stepperButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.papel,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  stepperButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  stepperCountContainer: {
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperCountText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: C.tinta,
  },
  totalPrecioText: {
    fontFamily: F.display,
    fontSize: 22,
    color: C.tinta,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnFavorito: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.lineaFuerte,
    backgroundColor: C.papel,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnFavoritoActivo: {
    borderColor: '#FFD5DC',
    backgroundColor: '#FFF0F2',
  },
  btnAgregar: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.tinta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  btnAgregarDeshabilitado: {
    opacity: 0.4,
  },
  btnAgregarTexto: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: C.papel,
  },
});
