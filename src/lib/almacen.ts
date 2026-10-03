import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Almacenamiento de la sesión y del secreto del pase: llavero seguro en el celular,
 * localStorage en la versión web (PWA).
 */
export const almacen = {
  async leer(clave: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(clave);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(clave);
  },
  async guardar(clave: string, valor: string | null): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (valor === null) localStorage.removeItem(clave);
        else localStorage.setItem(clave, valor);
      } catch {
        /* sin almacenamiento */
      }
      return;
    }
    if (valor === null) await SecureStore.deleteItemAsync(clave);
    else await SecureStore.setItemAsync(clave, valor);
  },
};
