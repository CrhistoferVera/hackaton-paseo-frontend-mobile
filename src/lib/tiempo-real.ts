import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { almacen } from './almacen';
import { API_URL, CLAVE_TOKEN } from './api';

let socket: Socket | null = null;
let tokenSocket: string | null = null;

let pendiente: Promise<Socket | null> | null = null;

/** Un solo socket compartido por todas las pantallas; se recrea solo si cambia la sesión. */
function conectar(): Promise<Socket | null> {
  pendiente ??= (async () => {
    const token = await almacen.leer(CLAVE_TOKEN);
    if (!token) return null;
    if (socket && tokenSocket === token) return socket;
    socket?.disconnect();
    tokenSocket = token;
    socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'], reconnectionDelay: 1500 });
    return socket;
  })().finally(() => {
    pendiente = null;
  });
  return pendiente;
}

export function desconectarTiempoReal() {
  socket?.disconnect();
  socket = null;
  tokenSocket = null;
}

/** Saldo, cupones y pedidos se actualizan sin recargar (HU-C04, HU-Y06). */
export function useTiempoReal(eventos: Record<string, (d: any) => void>) {
  const ref = useRef(eventos);
  useEffect(() => { ref.current = eventos; });

  useEffect(() => {
    let s: Socket | null = null;
    const manejadores: [string, (d: any) => void][] = [];
    let cancelado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function registrar(sock: Socket) {
      if (cancelado) return;
      s = sock;
      for (const n of Object.keys(ref.current)) {
        const fn = (d: any) => ref.current[n]?.(d);
        sock.on(n, fn);
        manejadores.push([n, fn]);
      }
      if (sock.connected && ref.current.connect) {
        try {
          ref.current.connect(null);
        } catch {}
      }
    }

    void conectar().then((x) => {
      if (cancelado) return;
      if (x) {
        registrar(x);
      } else {
        timer = setTimeout(() => {
          if (!cancelado) void conectar().then((reintento) => reintento && registrar(reintento));
        }, 600);
      }
    });

    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
      manejadores.forEach(([n, fn]) => s?.off(n, fn));
    };
  }, []);
}

