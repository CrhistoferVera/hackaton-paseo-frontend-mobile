import { Stack } from 'expo-router/stack';
import { C } from '@/constants/theme';

export default function LayoutAuth() {
  return <Stack screenOptions={{ headerShadowVisible: false, headerTitle: '', headerStyle: { backgroundColor: C.papel }, headerTintColor: C.tinta, contentStyle: { backgroundColor: C.papel } }}>
    <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
  </Stack>;
}
