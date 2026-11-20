// Google Drive yedeği: talep fotoğrafları silinmeden önce kullanıcının kendi Drive'ındaki
// "OTOKABUL Yedekleri" klasörüne aktarılır. Aracı, kullanıcının Google hesabında çalışan
// küçük bir Apps Script web uygulaması (adresi ve anahtarı panelden kaydedilir).
import { gizliAyar, int, str } from './db.js';

export async function driveAyar(D) {
  const [url, anahtar] = await Promise.all([gizliAyar(D, '_drive_url'), gizliAyar(D, '_drive_anahtar')]);
  return url && anahtar ? { url, anahtar } : null;
}

export async function driveGonder(dv, govde) {
  try {
    const r = await fetch(dv.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...govde, anahtar: dv.anahtar }), redirect: 'follow' });
    const t = await r.text();
    try { return JSON.parse(t); } catch { return { hata: 'Drive yanıtı okunamadı (' + r.status + ')' }; }
  } catch (e) { return { hata: 'Drive bağlantısı kurulamadı: ' + str(e && e.message) }; }
}

function b64(u8) {
  let s = ''; const P = 0x8000;
  for (let i = 0; i < u8.length; i += P) s += String.fromCharCode.apply(null, u8.subarray(i, i + P));
  return btoa(s);
}

const temiz = (x) => str(x).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();

function bilgiMetni(t) {
  return [
    'OTOKABUL · Teklif talebi #' + t.talep_id,
    'Tarih: ' + str(t.tarih),
    'Müşteri: ' + str(t.ad) + '  ·  Tel: ' + str(t.tel) + '  ·  İl: ' + str(t.il),
    'Araç: ' + [t.yil, t.marka, t.model].filter(Boolean).join(' ') + (t.versiyon ? ' · ' + t.versiyon : ''),
    'Kilometre: ' + (t.km ? Number(t.km).toLocaleString('tr-TR') + ' km' : '-') + '  ·  Renk: ' + str(t.renk),
    'Ön teklif: ' + (t.teklif_min ? Number(t.teklif_min).toLocaleString('tr-TR') + ' – ' + Number(t.teklif_max).toLocaleString('tr-TR') + ' TL' : '-'),
    'Durum: ' + str(t.durum),
    '',
    'www.otokabul.com.tr',
  ].join('\n');
}

// Bekleyen fotoğrafları birkaç adet halinde yedekler. sinir: yalnızca bu tarihten eski talepler; talepId: tek talep
export async function driveYedekle(D, dv, { sinir = '', talepId = 0, adet = 6 } = {}) {
  let kosul = 'f.drive IS NULL'; const b = [];
  if (talepId) { kosul += ' AND f.talep_id = ?'; b.push(talepId); }
  if (sinir) { kosul += ' AND t.tarih < ?'; b.push(sinir); }
  const { results } = await D.prepare(`SELECT f.id, f.talep_id, f.mime, f.veri, t.tarih, t.ad, t.tel, t.il, t.marka, t.model, t.yil, t.versiyon, t.km, t.renk, t.teklif_min, t.teklif_max, t.durum
    FROM talep_foto f LEFT JOIN talepler t ON t.id = f.talep_id WHERE ${kosul} ORDER BY f.id LIMIT ?`).bind(...b, adet).all();
  let yedeklenen = 0, hata = '';
  for (const f of results) {
    const ay = str(f.tarih).slice(0, 7) || 'Tarihsiz';
    const klasorAd = temiz(['#' + f.talep_id, [f.yil, f.marka, f.model].filter(Boolean).join(' '), f.ad].filter(Boolean).join(' · ')).slice(0, 110);
    const uz = /png/.test(str(f.mime)) ? 'png' : /webp/.test(str(f.mime)) ? 'webp' : 'jpg';
    const r = await driveGonder(dv, { yol: ['Talep Fotoğrafları', ay, klasorAd], ad: 'foto-' + f.id + '.' + uz, mime: f.mime || 'image/jpeg', veri: b64(new Uint8Array(f.veri)), bilgi: bilgiMetni(f) });
    if (!r || !r.ok) { hata = (r && r.hata) || 'bilinmeyen hata'; break; }
    await D.prepare('UPDATE talep_foto SET drive = ? WHERE id = ?').bind(str(r.id) || 'var', f.id).run();
    yedeklenen++;
  }
  let kk = 'drive IS NULL'; const kb = [];
  if (talepId) { kk += ' AND talep_id = ?'; kb.push(talepId); }
  if (sinir) { kk += ' AND talep_id IN (SELECT id FROM talepler WHERE tarih < ?)'; kb.push(sinir); }
  const k = await D.prepare('SELECT COUNT(*) n FROM talep_foto WHERE ' + kk).bind(...kb).first();
  return { yedeklenen, kalan: int(k && k.n), hata };
}
