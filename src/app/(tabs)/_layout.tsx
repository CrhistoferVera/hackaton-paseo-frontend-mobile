import { Tabs } from 'expo-router/js-tabs';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C, F } from '@/constants/theme';
import { useCarrito } from '@/lib/carrito';

/** Iconos de trazo fino dibujados para el proyecto (sin emojis ni sets genéricos). */
const ICONOS: Record<string, (c: string) => React.ReactNode> = {
  index: (c) => <Path d="M3 9.5 11 3.5l8 6V19H3z" stroke={c} strokeWidth={1.4} fill="none" />,
  paseoya: (c) => <><Path d="M4 6.5h14l-1.2 12.5H5.2z" stroke={c} strokeWidth={1.4} fill="none" /><Path d="M8 6.5V5h6v1.5" stroke={c} strokeWidth={1.4} fill="none" /></>,
  mapa: (c) => <><Path d="M3 5l5-1.7 6 2.2 5-1.7v13.4l-5 1.7-6-2.2-5 1.7z" stroke={c} strokeWidth={1.4} fill="none" /><Path d="M8 3.3v13.4M14 5.5v13.4" stroke={c} strokeWidth={1.4} /></>,
  canjes: (c) => <Path d="M3 6h16v3.5a2 2 0 0 0 0 3.6V16.5H3v-3.4a2 2 0 0 0 0-3.6z" stroke={c} strokeWidth={1.4} fill="none" />,
  perfil: (c) => <><Circle cx={11} cy={7.5} r={3.5} stroke={c} strokeWidth={1.4} fill="none" /><Path d="M4 19c.9-3.6 3.7-5.2 7-5.2s6.1 1.6 7 5.2" stroke={c} strokeWidth={1.4} fill="none" /></>,
};

export default function LayoutTabs() {
  const { items } = useCarrito();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.tinta,
        tabBarInactiveTintColor: C.grafito,
        tabBarStyle: { backgroundColor: C.papel, borderTopColor: C.linea, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: F.senal, fontSize: 9.5, letterSpacing: 0.6 },
        tabBarIcon: ({ color }) => (
          <Svg width={22} height={22} viewBox="0 0 22 22">
            {ICONOS[route.name]?.(String(color)) ?? <Rect x={4} y={4} width={14} height={14} stroke={String(color)} fill="none" />}
          </Svg>
        ),
      })}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="paseoya" options={{ title: 'PaseoYa', tabBarBadge: items.length ? items.length : undefined, tabBarBadgeStyle: { backgroundColor: C.oroBrillo, color: C.tinta, fontSize: 10 } }} />
      <Tabs.Screen name="mapa" options={{ title: 'Mapa' }} />
      <Tabs.Screen name="canjes" options={{ title: 'Canjes' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
