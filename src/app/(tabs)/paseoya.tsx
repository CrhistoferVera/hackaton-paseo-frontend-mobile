import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import { IrA, Pantalla, T } from '@/components/ui';
import { C } from '@/constants/theme';

export default function PaseoYa() {
  const router = useRouter();

  return (
    <Pantalla contenido={{ flexGrow: 1 }}>
      {/* Zona Superior: Botón Mis Pedidos */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8, zIndex: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ir a mis pedidos"
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/pedidos');
          }}
          style={({ pressed }) => [
            {
              backgroundColor: C.tinta,
              borderRadius: 99,
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              minHeight: 48,
              minWidth: 48,
              justifyContent: 'center',
              shadowColor: C.tinta,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            },
            pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 }
          ]}
        >
          <T style={{ fontSize: 16, lineHeight: 20 }}></T>
          <T v="senal" style={{ color: C.papel }}>Mis pedidos</T>
        </Pressable>
      </View>

      {/* Zona Central: Título, Subtítulo y Tarjetas centrado verticalmente */}
      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 24, zIndex: 1 }}>
        <T
          adjustsFontSizeToFit
          numberOfLines={2}
          style={{
            fontFamily: 'Pacifico_400Regular',
            fontSize: 40,
            lineHeight: 56, // 1.4x fontSize para evitar recortes
            color: C.tinta,
            marginBottom: 4,
            paddingVertical: 8, // extra padding vertical
            includeFontPadding: true, // fix para Android
            overflow: 'visible'
          }}
        >
          ¡Bienvenido a PaseoYa!
        </T>
        <T style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: C.grafito, marginBottom: 32 }}>
          ¿Qué estás buscando?
        </T>

        <View style={{ flexDirection: 'column', gap: 40 }}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/buscar?section=food');
            }}
            accessibilityRole="button"
            accessibilityLabel="Ir a PaseoFood, comida y bebidas"
            style={({ pressed }) => [
              {
                backgroundColor: C.veladura,
                borderRadius: 24,
                padding: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 140,
                shadowColor: C.tinta,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 2,
                overflow: 'visible'
              },
              pressed && { transform: [{ scale: 0.97 }] }
            ]}
          >
            <View style={{ width: '55%', zIndex: 2 }}>
              <T style={{ fontFamily: 'Montserrat_700Bold', fontSize: 22, color: C.tinta, marginBottom: 4 }}>PaseoFood</T>
              <T style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.grafito }}>Comida, postres y bebidas</T>
            </View>
            <View style={{ position: 'absolute', right: 0, top: -20, width: '45%', height: 160, justifyContent: 'center', alignItems: 'center', zIndex: 1, transform: [{ rotate: '-4deg' }] }}>
              {/* TODO: Reemplazar este placeholder por un PNG de comida con transparencia real y fondo limpio */}
              <View style={{ width: 130, height: 130, backgroundColor: '#FADDA8', borderRadius: 65, justifyContent: 'center', alignItems: 'center', shadowColor: C.tinta, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
                <T v="titulo" style={{ fontSize: 60, lineHeight: 70 }}>🍔</T>
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/buscar?section=shop');
            }}
            accessibilityRole="button"
            accessibilityLabel="Ir a PaseoShop, tecnología, moda y más"
            style={({ pressed }) => [
              {
                backgroundColor: C.veladura,
                borderRadius: 24,
                padding: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 140,
                shadowColor: C.tinta,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 2,
                overflow: 'visible'
              },
              pressed && { transform: [{ scale: 0.97 }] }
            ]}
          >
            <View style={{ width: '55%', zIndex: 2 }}>
              <T style={{ fontFamily: 'Montserrat_700Bold', fontSize: 22, color: C.tinta, marginBottom: 4 }}>PaseoShop</T>
              <T style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.grafito }}>Tecnología, moda y más</T>
            </View>
            <View style={{ position: 'absolute', right: 0, top: -20, width: '45%', height: 160, justifyContent: 'center', alignItems: 'center', zIndex: 1, transform: [{ rotate: '4deg' }] }}>
              {/* TODO: Reemplazar este placeholder por un PNG de compras/bolsa con transparencia real y fondo limpio */}
              <View style={{ width: 130, height: 130, backgroundColor: '#D8E2DC', borderRadius: 65, justifyContent: 'center', alignItems: 'center', shadowColor: C.tinta, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
                <T v="titulo" style={{ fontSize: 60, lineHeight: 70 }}>🛍️</T>
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </Pantalla>
  );
}
