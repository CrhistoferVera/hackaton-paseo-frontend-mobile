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
| Inicio | Tus ofertas de hoy (personales, generadas por la IA, con el motivo y cómo llegar) · HU-C04 saldo en tiempo real · HU-C05 nivel · HU-C13 misiones · HU-C20 avisos por geocerca · promociones · eventos de hoy |
| Pase | HU-C03 QR TOTP que rota cada 60 s, generado sin conexión, y código de 6 dígitos |
| Movimientos | HU-C06 historial con filtros |
| Canjes, cupón | HU-C07 catálogo · HU-C08 cupón de un solo uso de 15 min |
| Mapa | HU-C10 plano interactivo con «Estás aquí», locales abiertos y cerrados, servicios, promociones, eventos, monedas y Drops en vivo; buscador de locales, productos y servicios; guía paso a paso con voz |
| Eventos | Agenda del Paseo por día, con puntos por asistir y cómo llegar |
| Escanear | HU-C12 check-in en la puerta · HU-X01 Llegué al Paseo · acceso a hitos, parqueo y factura |
| AR | HU-X04 moneda en hitos · HU-X05 Drop espacial |
| Misiones | HU-C13 misiones con progreso; la personal la propone la IA |
| Factura | HU-C16 QR de factura SIAT |
| Invitar | HU-C18 referidos |
| Jarvis | HU-C21 · HU-Y12 · conversación con memoria sobre promociones, eventos, precios, tiempos, horarios, servicios, puntos y pedidos; por voz o texto |
| Privacidad | HU-C22 permisos y eliminar cuenta |
| Parqueo | HU-X02 parqueo con puntos (simulado) |
| PaseoYa, producto | HU-Y01 categorías · HU-Y02 buscador global · HU-Y03 ficha |
| Carrito | HU-Y04 carrito multi-local · HU-Y05 franja de retiro · HU-Y11 pago QR anticipado |
| Pedido | HU-Y06 estado en tiempo real · HU-Y07 QR y PIN por local · HU-Y08 Llegué · HU-Y09 puntos al retirar |
| Pedidos, favoritos | HU-Y10 historial, recompra y favoritos |

## Jarvis por voz

- **Hablar (TTS):** voz neuronal en español nativo (Piper es_MX) generada por el servidor del Paseo y reproducida con `expo-audio`. Suena igual en Android, iPhone y la web, aunque el equipo no tenga voces en español. Empieza por la primera frase mientras prepara las siguientes. En Perfil se elige «Natural en español» o «Del teléfono» (respaldo con `expo-speech`, eligiendo una voz en español) y se puede apagar.
- **Escuchar (STT):** `expo-audio` graba la pregunta (hasta 15 s) y la sube a `POST /cliente/jarvis/voz`. El servidor del Paseo la transcribe con Whisper local y Jarvis responde en la misma llamada. Funciona igual en Expo Go, en la app instalada y en el navegador. No depende del reconocedor del navegador, que enviaba el audio a Google y fallaba con «Network». El audio no se guarda.
- **Conversación con memoria:** `src/app/jarvis.tsx` retoma la conversación al volver (`/cliente/jarvis/historial`) y muestra sugerencias, productos, eventos y promociones. Tiene botones de ruta, AR y acciones, y «Nueva conversación».
- **Jarvis proactivo:** `components/jarvis-en-vivo.tsx` escucha `orden_voz_jarvis`, lo dice en voz alta y muestra un aviso con «Ver ruta», «Abrir AR» o «Ver pedido».
- **Rutas:** `components/guia-ruta.tsx` (en el Mapa y en la pantalla `ruta`) resalta el tramo del paso actual, cambia de piso sola, lee cada paso y al «Llegué» actualiza tu posición. Es la alternativa sin hardware a las flechas AR en el piso.

Se eligió `expo-speech` (voz) y `expo-audio` (grabación) en lugar de `react-native-tts` y `@react-native-voice/voice`: están mantenidas para Expo SDK 57, funcionan en Expo Go y en la web, y la transcripción queda en el servidor del Paseo, sin nube.

## Notas

- El pase se calcula en el celular con HMAC-SHA1 (`src/lib/totp.ts`); el secreto vive en el llavero seguro.
- La experiencia AR usa la cámara de fondo y reconoce el QR del cartel. El rastreo de imagen sin QR (MindAR) queda para una versión posterior.
- Las notificaciones de Drops y puntos dobles llegan por Socket.IO mientras la app está abierta. Para avisos con la app cerrada hace falta una build de desarrollo con `expo-notifications`.
