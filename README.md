# Paseo Points · App del cliente

App del cliente de Paseo Aranjuez. Expo SDK 57, Expo Router, Socket.IO.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local
npx expo start
```

- **Celular con Expo Go**: en `.env.local` pon la IP de la computadora que corre la API, por ejemplo `EXPO_PUBLIC_API_URL=http://192.168.1.20:4000`, y escanea el QR que muestra Expo. Todas las librerías nativas usadas (cámara, ubicación, llavero seguro, selector de imágenes, SVG) vienen en Expo Go.
- **Navegador**: `npx expo start --web`.

La API (`hackaton-paseo-backend`) debe estar corriendo. Cliente demo: `70000001` / `Maria2026!`.

## Pantallas e historias

| Pantalla | Historias |
| --- | --- |
| Bienvenida, registro (`(auth)`) | HU-C01 registro en una pantalla con consentimiento separado y bono |
| Ingresar | HU-C02 contraseña u OTP; sesión persistente |
| Inicio | HU-C04 saldo en tiempo real · HU-C05 nivel · HU-C13 misiones · HU-C20 avisos por geocerca · promociones |
| Pase | HU-C03 QR TOTP que rota cada 60 s, generado sin conexión, y código de 6 dígitos |
| Movimientos | HU-C06 historial con filtros |
| Canjes, cupón | HU-C07 catálogo · HU-C08 cupón de un solo uso de 15 min |
| Mapa | HU-C10 plano interactivo y buscador |
| Escanear | HU-C12 check-in en la puerta · HU-X01 Llegué al Paseo · acceso a hitos, parqueo y factura |
| AR | HU-X04 moneda en hitos · HU-X05 Drop espacial |
| Misiones | HU-C13 misiones con progreso; la personal la propone la IA |
| Factura | HU-C16 QR de factura SIAT |
| Invitar | HU-C18 referidos |
| Jarvis | HU-C21 saldo y canjes · HU-Y12 buscar productos |
| Privacidad | HU-C22 permisos y eliminar cuenta |
| Parqueo | HU-X02 parqueo con puntos (simulado) |
| PaseoYa, producto | HU-Y01 categorías · HU-Y02 buscador global · HU-Y03 ficha |
| Carrito | HU-Y04 carrito multi-local · HU-Y05 franja de retiro · HU-Y11 pago QR anticipado |
| Pedido | HU-Y06 estado en tiempo real · HU-Y07 QR y PIN por local · HU-Y08 Llegué · HU-Y09 puntos al retirar |
| Pedidos, favoritos | HU-Y10 historial, recompra y favoritos |

## Jarvis por voz

- **Hablar (TTS):** `expo-speech`, el sintetizador del propio teléfono (Siri en iOS, Google en Android, Web Speech en el navegador). Es instantáneo, gratis y no usa datos. Se apaga en Perfil → «Jarvis habla en voz alta».
- **Escuchar (STT):** `expo-speech-recognition`, el reconocedor del teléfono. En el celular usa reconocimiento en el dispositivo cuando el sistema lo soporta, y solo el texto viaja al backend. Es un módulo nativo: hace falta una build de desarrollo (`npx expo run:android` o `eas build --profile development`). En Expo Go el micrófono se oculta y se escribe la pregunta. En el navegador funciona con Chrome.
- **Jarvis proactivo:** `components/jarvis-en-vivo.tsx` escucha `orden_voz_jarvis`, lo dice en voz alta y muestra un aviso con «Ver ruta», «Abrir AR» o «Ver pedido».
- **Rutas:** la pantalla `ruta` dibuja el recorrido en el plano de cada piso y lee las indicaciones paso a paso. Es la alternativa sin hardware a las flechas AR en el piso.

Se eligió `expo-speech` y `expo-speech-recognition` en lugar de `react-native-tts` y `@react-native-voice/voice`. Usan los mismos motores nativos, pero están mantenidas para Expo SDK 57, se configuran con plugins en `app.json` y tienen versión web.

## Notas

- El pase se calcula en el celular con HMAC-SHA1 (`src/lib/totp.ts`); el secreto vive en el llavero seguro.
- La experiencia AR usa la cámara de fondo y reconoce el QR del cartel. El rastreo de imagen sin QR (MindAR) queda para una versión posterior.
- Las notificaciones de Drops y puntos dobles llegan por Socket.IO mientras la app está abierta. Para avisos con la app cerrada hace falta una build de desarrollo con `expo-notifications`.
