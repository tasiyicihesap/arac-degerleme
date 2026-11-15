// Ortak yardımcılar: JSON cevap, rastgele anahtar, şifre özeti, imzalı oturum çerezi
export function json(d, kod = 200, ek = {}) {
  return new Response(typeof d === 'string' ? d : JSON.stringify(d), {
    status: kod,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...ek },
  });
}

export function rastgeleHex(n) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const b64 = (u8) => btoa(String.fromCharCode(...u8));
const b64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlCoz = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// ---- şifre: PBKDF2-SHA256 ----
const TUR = 20000;
async function pbkdf2(sifre, tuz, tur) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(sifre), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: tuz, iterations: tur }, k, 256));
}
export async function sifreOzet(sifre) {
  const tuz = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${TUR}$${b64(tuz)}$${b64(await pbkdf2(sifre, tuz, TUR))}`;
}
export async function sifreDogrula(sifre, ozet) {
  const p = String(ozet || '').split('$');
  if (p.length !== 4 || p[0] !== 'pbkdf2') return false;
  const h = await pbkdf2(String(sifre), unb64(p[2]), parseInt(p[1], 10));
  const b = unb64(p[3]);
  if (h.length !== b.length) return false;
  let f = 0; for (let i = 0; i < h.length; i++) f |= h[i] ^ b[i];
  return f === 0;
}

// ---- imzalı oturum çerezi (PHP oturumunun yerine) ----
async function hmac(gizli, veri) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(gizli), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(veri)));
  return b64(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const CEREZ = 'otk_yonetim';
export async function oturumYaz(gizli, veri) {
  const g = b64url(JSON.stringify(veri));
  return `${g}.${await hmac(gizli, g)}`;
}
export async function oturumOku(gizli, cerez) {
  if (!cerez) return null;
  const [g, imza] = cerez.split('.');
  if (!g || !imza) return null;
  if ((await hmac(gizli, g)) !== imza) return null;
  try { const v = JSON.parse(b64urlCoz(g)); return v && v.e > Date.now() ? v : null; } catch (e) { return null; }
}
export function cerezAl(req, ad) {
  const c = req.headers.get('Cookie') || '';
  for (const p of c.split(';')) { const [k, ...v] = p.trim().split('='); if (k === ad) return v.join('='); }
  return null;
}
export function cerezBaslik(ad, deger, sil = false) {
  return `${ad}=${sil ? '' : deger}; Path=/yonetim/; HttpOnly; Secure; SameSite=Strict${sil ? '; Max-Age=0' : ''}`;
}
