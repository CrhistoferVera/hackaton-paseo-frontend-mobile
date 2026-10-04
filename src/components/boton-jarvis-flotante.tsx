import * as Haptics from 'expo-haptics';
import { useRouter, useSegments } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { C } from '@/constants/theme';

/**
 * Icono de constelación de destellos (sparkles), representación universal de Inteligencia Artificial.
 */
function IconoIA({ color = C.oroBrillo, size = 26 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Destello principal */}
      <Path
        d="M10 3C10 7.42 6.42 11 2 11C6.42 11 10 14.58 10 19C10 14.58 13.58 11 18 11C13.58 11 10 7.42 10 3Z"
        fill={color}
      />
      {/* Destello superior derecho */}
      <Path
        d="M18.5 2C18.5 3.93 16.93 5.5 15 5.5C16.93 5.5 18.5 7.07 18.5 9C18.5 7.07 20.07 5.5 22 5.5C20.07 5.5 18.5 3.93 18.5 2Z"
        fill={color}
      />
      {/* Destello inferior derecho */}
      <Path
        d="M18 16C18 17.38 16.88 18.5 15.5 18.5C16.88 18.5 18 19.62 18 21C18 19.62 19.12 18.5 20.5 18.5C19.12 18.5 18 17.38 18 16Z"
        fill={color}
      />
    </Svg>
  );
}

/**
 * Botón flotante para acceder a Jarvis desde cualquier pantalla de la aplicación.
 * Solo contiene el icono de IA para un diseño limpio y minimalista.
 * Se oculta automáticamente cuando el usuario ya está dentro de la pantalla de Jarvis o en autenticación.
 */
export function BotonJarvisFlotante() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const segmentos = useSegments();

  // Ocultar si ya estamos en Jarvis o en pantallas de autenticación
  const enJarvis = segmentos.some((s) => s === 'jarvis');
  const enAuth = segmentos[0] === '(auth)' || segmentos[0] === 'bienvenida';

  if (enJarvis || enAuth) {
    return null;
  }

  // Ajustar distancia inferior: en pestañas la barra mide 64px, en pantallas secundarias solo el margen seguro
  const enTabs = !segmentos.length || segmentos[0] === '(tabs)';
  const bottom = insets.bottom + (enTabs ? 80 : 22);

  const irAJarvis = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/jarvis');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir Jarvis"
      accessibilityHint="Accede al asistente de inteligencia artificial"
      onPress={irAJarvis}
      style={({ pressed }) => [
        s.boton,
        {
          bottom,
          transform: [{ scale: pressed ? 0.92 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <IconoIA color={C.oroBrillo} size={26} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  boton: {
    position: 'absolute',
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.sala,
    borderWidth: 1.5,
    borderColor: C.oroBrillo,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 45,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
      default: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      },
    }),
  },
});

