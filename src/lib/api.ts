import { almacen } from './almacen';

/**
 * Cliente HTTP del backend. En un celular físico define EXPO_PUBLIC_API_URL con la IP
 * de la computadora que corre la API (por ejemplo http://192.168.1.20:4000).
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
export const CLAVE_TOKEN = 'pp.token';

let tokenEnMemoria: string | null = null;
let alExpirar: (() => void) | null = null;

export function configurarSesion(token: string | null, expiracion?: () => void) {
  tokenEnMemoria = token;
  if (expiracion) alExpirar = expiracion;
}

export class ErrorApi extends Error {
  constructor(public readonly estado: number, mensaje: string) {
    super(mensaje);
  }
}

type Opciones = { metodo?: string; cuerpo?: unknown; formulario?: FormData };

export async function api<T = any>(ruta: string, op: Opciones = {}): Promise<T> {
  const token = tokenEnMemoria ?? (await almacen.leer(CLAVE_TOKEN));
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (op.cuerpo !== undefined) headers['content-type'] = 'application/json';
  let r: Response;
  try {
    r = await fetch(`${API_URL}${ruta}`, {
      method: op.metodo ?? (op.cuerpo !== undefined || op.formulario ? 'POST' : 'GET'),
      headers,
      body: (op.formulario as any) ?? (op.cuerpo !== undefined ? JSON.stringify(op.cuerpo) : undefined),
    });
  } catch {
    throw new ErrorApi(0, 'Sin conexión con Paseo Points. Revisa tu internet.');
  }
  const texto = await r.text();
  let datos: any = texto;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    /* no JSON */
  }
  if (!r.ok) {
    if (r.status === 401 && token && !ruta.startsWith('/auth/')) alExpirar?.();
    const msg = Array.isArray(datos?.message) ? datos.message.join('. ') : datos?.message ?? `Error ${r.status}`;
    throw new ErrorApi(r.status, msg);
  }
  return datos as T;
}

export const urlArchivo = (ruta?: string | null) => (ruta ? (ruta.startsWith('http') ? ruta : `${API_URL}${ruta}`) : null);
