import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton, T } from '@/components/ui';
import { C } from '@/constants/theme';

/** Puerta de entrada: se llega escaneando la tarjeta QR de una mesa del patio de comidas (?mesa=T-14). */
export default function Bienvenida() {
  const { mesa } = useLocalSearchParams<{ mesa?: string }>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.sala }}>
      <View style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}>
        <View style={{ gap: 18, marginTop: 24 }}>
          <T v="senal" oro oscuro>Paseo Aranjuez{mesa ? ` · Mesa ${mesa}` : ''}</T>
          <T oscuro style={{ fontFamily: 'BodoniModa_500Medium', fontSize: 54, lineHeight: 56 }}>Paseo Points</T>
          <T v="italica" oscuro tenue>Cada compra en el Paseo suma. Canjea café, cine, parqueo y más.</T>
        </View>
        <View style={{ gap: 14 }}>
          <View style={{ borderTopWidth: 1, borderTopColor: C.salaLinea, paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <T oscuro>Bono de bienvenida</T>
            <T oscuro oro style={{ fontFamily: 'BodoniModa_500Medium', fontSize: 30 }}>100 pts</T>
          </View>
          <Boton href="/registro" titulo="Crear mi cuenta" variante="oro" />
          <Boton href="/entrar" titulo="Ya tengo cuenta" variante="claro" estilo={{ borderColor: C.salaLinea, backgroundColor: C.salaTinta }} />
          <T v="chico" oscuro tenue style={{ textAlign: 'center' }}>Toma menos de un minuto. Sin descargar nada si usas la versión web.</T>
        </View>
      </View>
    </SafeAreaView>
  );
}
