import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { C } from '@/constants/theme';
import { Boton, Campo, T } from './ui';

/**
 * Lector de QR con la cámara del celular (expo-camera). Si no hay cámara o permiso,
 * el código se puede escribir o pegar a mano.
 */
export function Escaner({ onLeido, pausado, alto = 320, superpuesto }: { onLeido: (texto: string) => void; pausado?: boolean; alto?: number; superpuesto?: React.ReactNode }) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const ultimo = useRef<{ t: string; en: number } | null>(null);

  const leer = (t: string) => {
    const ahora = Date.now();
    if (pausado) return;
    if (ultimo.current && ultimo.current.t === t && ahora - ultimo.current.en < 3000) return;
    ultimo.current = { t, en: ahora };
    onLeido(t);
  };

  return (
    <View style={{ gap: 12 }}>
      {permiso?.granted ? (
        <View style={{ height: alto, overflow: 'hidden', backgroundColor: '#000' }}>
          <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={pausado ? undefined : (r) => leer(r.data)} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <View style={{ width: 220, height: 220, borderWidth: 1, borderColor: C.salaOro }} />
          </View>
          {superpuesto}
        </View>
      ) : (
        <Pressable onPress={() => void pedirPermiso()} style={{ height: 140, backgroundColor: C.sala, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 6 }}>
          <T oscuro v="subtitulo">Activar la cámara</T>
          <T oscuro tenue v="chico" style={{ textAlign: 'center' }}>{permiso?.canAskAgain === false ? 'Habilita la cámara en los ajustes del celular.' : 'Toca para permitir el acceso y escanear códigos QR.'}</T>
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="O escribe el código" value={manual} onChangeText={setManual} autoCapitalize="characters" placeholder="PPL:L-XXXXXXXX" />
        </View>
        <Boton titulo="Usar" variante="claro" onPress={() => { if (manual.trim()) { leer(manual.trim()); setManual(''); } }} />
      </View>
    </View>
  );
}
