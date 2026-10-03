import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { almacen } from './almacen';
import { api, CLAVE_TOKEN, configurarSesion } from './api';

export interface Usuario {
  id: string;
  nombre: string;
  rol: string;
  celular: string | null;
  correo: string | null;
}

interface Ctx {
  usuario: Usuario | null;
  cargando: boolean;
  iniciar: (token: string, u: Usuario) => Promise<void>;
  salir: () => Promise<void>;
}

const Contexto = createContext<Ctx>({ usuario: null, cargando: true, iniciar: async () => {}, salir: async () => {} });
const CLAVE_USUARIO = 'pp.usuario';
const CLAVE_PASE = 'pp.pase';

/** Sesión persistente en el celular (HU-C02): el token dura 30 días y vive en el llavero seguro. */
export function ProveedorSesion({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const salir = useCallback(async () => {
    configurarSesion(null);
    await almacen.guardar(CLAVE_TOKEN, null);
    await almacen.guardar(CLAVE_USUARIO, null);
    await almacen.guardar(CLAVE_PASE, null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    (async () => {
      const token = await almacen.leer(CLAVE_TOKEN);
      configurarSesion(token, () => void salir());
      if (token) {
        const guardado = await almacen.leer(CLAVE_USUARIO);
        if (guardado) setUsuario(JSON.parse(guardado));
        try {
          const u = await api('/auth/yo');
          if (u.rol !== 'cliente') await salir();
          else setUsuario({ id: u.id, nombre: u.nombre, rol: u.rol, celular: u.celular, correo: u.correo });
        } catch (e: any) {
          if (e.estado === 401) await salir();
        }
      }
      setCargando(false);
    })();
  }, [salir]);

  const iniciar = useCallback(async (token: string, u: Usuario) => {
    configurarSesion(token, () => void salir());
    await almacen.guardar(CLAVE_TOKEN, token);
    await almacen.guardar(CLAVE_USUARIO, JSON.stringify(u));
    await almacen.guardar(CLAVE_PASE, null); // el secreto del pase se vuelve a descargar con la nueva sesión
    setUsuario(u);
  }, [salir]);

  return <Contexto.Provider value={{ usuario, cargando, iniciar, salir }}>{children}</Contexto.Provider>;
}

export const useSesion = () => useContext(Contexto);

/** El secreto del pase se guarda en el dispositivo para generar el QR sin conexión. */
export async function obtenerPase(): Promise<{ codigoCliente: string; secreto: string } | null> {
  const guardado = await almacen.leer(CLAVE_PASE);
  if (guardado) return JSON.parse(guardado);
  try {
    const p = await api('/cliente/pase');
    await almacen.guardar(CLAVE_PASE, JSON.stringify({ codigoCliente: p.codigoCliente, secreto: p.secreto }));
    return p;
  } catch {
    return null;
  }
}

export async function rotarPase() {
  const p = await api('/cliente/pase/rotar', { cuerpo: {} });
  await almacen.guardar(CLAVE_PASE, JSON.stringify({ codigoCliente: p.codigoCliente, secreto: p.secreto }));
  return p;
}
