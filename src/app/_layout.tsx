import { BodoniModa_400Regular_Italic, BodoniModa_500Medium } from '@expo-google-fonts/bodoni-moda';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { useFonts } from 'expo-font';
import { useRouter, useSegments } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { JarvisEnVivo } from '@/components/jarvis-en-vivo';
import { C } from '@/constants/theme';
import { ProveedorCarrito } from '@/lib/carrito';
import { ProveedorSesion, useSesion } from '@/lib/sesion';

void SplashScreen.preventAutoHideAsync();

function Guardia() {
  const { usuario, cargando } = useSesion();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    const enAuth = segmentos[0] === '(auth)';
    if (!usuario && !enAuth) router.replace('/bienvenida');
    else if (usuario && enAuth) router.replace('/');
  }, [usuario, cargando, segmentos, router]);

  useEffect(() => {
    if (!cargando) void SplashScreen.hideAsync();
  }, [cargando]);

  return (
    <>
    <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: C.papel }, headerTintColor: C.tinta, headerTitleStyle: { fontFamily: 'BodoniModa_500Medium' }, headerBackTitle: 'Atrás', contentStyle: { backgroundColor: C.papel } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="pase" options={{ presentation: 'modal', headerShown: false, contentStyle: { backgroundColor: C.sala } }} />
      <Stack.Screen name="ar/[codigo]" options={{ headerShown: false, contentStyle: { backgroundColor: C.sala } }} />
      <Stack.Screen name="escanear" options={{ title: 'Escanear' }} />
      <Stack.Screen name="movimientos" options={{ title: 'Historial de puntos' }} />
      <Stack.Screen name="nivel" options={{ title: 'Tu nivel' }} />
      <Stack.Screen name="misiones" options={{ title: 'Misiones' }} />
      <Stack.Screen name="cupon/[id]" options={{ title: 'Cupón' }} />
      <Stack.Screen name="producto/[id]" options={{ title: 'Producto' }} />
      <Stack.Screen name="carrito" options={{ title: 'Tu carrito' }} />
      <Stack.Screen name="pedidos" options={{ title: 'Mis pedidos' }} />
      <Stack.Screen name="pedido/[id]" options={{ title: 'Pedido' }} />
      <Stack.Screen name="favoritos" options={{ title: 'Favoritos' }} />
      <Stack.Screen name="jarvis" options={{ title: 'Jarvis' }} />
      <Stack.Screen name="factura" options={{ title: 'Escanear factura' }} />
      <Stack.Screen name="parqueo" options={{ title: 'Parqueo' }} />
      <Stack.Screen name="privacidad" options={{ title: 'Privacidad' }} />
      <Stack.Screen name="invitar" options={{ title: 'Invitar amigos' }} />
      <Stack.Screen name="notificaciones" options={{ title: 'Avisos' }} />
      <Stack.Screen name="ruta" options={{ title: 'Cómo llegar' }} />
      <Stack.Screen name="eventos" options={{ title: 'Eventos' }} />
      <Stack.Screen name="buscar" options={{ headerShown: false, gestureEnabled: true }} />
    </Stack>
    {usuario && <JarvisEnVivo />}
    </>
  );
}

export default function RootLayout() {
  const [cargadas] = useFonts({
    BodoniModa_500Medium,
    BodoniModa_400Regular_Italic,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    Pacifico_400Regular,
  });
  if (!cargadas) return null;
  return (
    <ProveedorSesion>
      <ProveedorCarrito>
        <StatusBar style="dark" />
        <Guardia />
      </ProveedorCarrito>
    </ProveedorSesion>
  );
}
