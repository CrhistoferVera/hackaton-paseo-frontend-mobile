/**
 * TOTP (RFC 6238) con HMAC-SHA1 en JavaScript puro: el pase se genera en el celular
 * sin conexión y cambia cada 60 s, así una captura de pantalla deja de servir.
 */
function sha1(bytes: Uint8Array): Uint8Array {
  const ml = bytes.length * 8;
  const conRelleno = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  conRelleno.set(bytes);
  conRelleno[bytes.length] = 0x80;
  const dv = new DataView(conRelleno.buffer);
  dv.setUint32(conRelleno.length - 4, ml >>> 0);
  dv.setUint32(conRelleno.length - 8, Math.floor(ml / 2 ** 32));
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  const rot = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  for (let i = 0; i < conRelleno.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 80; t++) w[t] = rot(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let t = 0; t < 80; t++) {
      const [f, k] = t < 20 ? [(b & c) | (~b & d), 0x5a827999] : t < 40 ? [b ^ c ^ d, 0x6ed9eba1] : t < 60 ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc] : [b ^ c ^ d, 0xca62c1d6];
      const tmp = (rot(a, 5) + f + e + k + w[t]) >>> 0;
      e = d;
      d = c;
      c = rot(b, 30) >>> 0;
      b = a;
      a = tmp;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const o = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((h, i) => o.setUint32(i * 4, h));
  return out;
}

function hmacSha1(clave: Uint8Array, mensaje: Uint8Array): Uint8Array {
  let k = clave.length > 64 ? sha1(clave) : clave;
  const kp = new Uint8Array(64);
  kp.set(k);
  const ipad = new Uint8Array(64 + mensaje.length);
  const opad = new Uint8Array(64 + 20);
  for (let i = 0; i < 64; i++) {
    ipad[i] = kp[i] ^ 0x36;
    opad[i] = kp[i] ^ 0x5c;
  }
  ipad.set(mensaje, 64);
  opad.set(sha1(ipad), 64);
  return sha1(opad);
}

const hexABytes = (hex: string) => new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

export function totp(secretoHex: string, epochMs = Date.now(), paso = 60): string {
  const contador = Math.floor(epochMs / 1000 / paso);
  const msg = new Uint8Array(8);
  const dv = new DataView(msg.buffer);
  dv.setUint32(0, Math.floor(contador / 2 ** 32));
  dv.setUint32(4, contador >>> 0);
  const h = hmacSha1(hexABytes(secretoHex), msg);
  const off = h[19] & 0x0f;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 1_000_000).padStart(6, '0');
}

export const segundosRestantes = (paso = 60) => paso - (Math.floor(Date.now() / 1000) % paso);
