// OTOKABUL — bildirimler: e-posta (Cloudflare Email) ve WhatsApp (CallMeBot)
import { str } from './db.js';

const GONDEREN = 'bilgi@otokabul.com.tr';

// panelde "Bildirim e-postası" ayarına gider; adres Cloudflare'de doğrulanmış olmalı
export async function epostaGonder(env, A, { konu, metin, yanitla }) {
  const kime = str(A.bildirim_eposta).trim();
  if (!kime) return 'kapalı';
  if (!env.EPOSTA) return 'hata: e-posta bağlantısı yok';
  try {
    const m = { from: { email: GONDEREN, name: 'OTOKABUL Site' }, to: kime, subject: konu, text: metin };
    if (yanitla && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(yanitla)) m.replyTo = yanitla;
    await env.EPOSTA.send(m);
    return 'gönderildi';
  } catch (e) {
    console.error('eposta', e);
    return 'hata: ' + String(e && e.message ? e.message : e).slice(0, 150);
  }
}

// CallMeBot: telefondan bota "I allow callmebot to send me messages" yazılınca gelen anahtar
export async function whatsappGonder(A, metin) {
  const tel = str(A.wa_bildirim_tel).replace(/[^\d]/g, '');
  const anahtar = str(A.wa_bildirim_anahtar).trim();
  if (!tel || !anahtar) return 'kapalı';
  try {
    const u = 'https://api.callmebot.com/whatsapp.php?phone=%2B' + tel + '&apikey=' + encodeURIComponent(anahtar) + '&text=' + encodeURIComponent(metin.slice(0, 1500));
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    if (!r.ok || /error|invalid|not\s+(allowed|valid)/i.test(t.replace(/<[^>]+>/g, ' ').slice(0, 600))) return 'hata: ' + t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
    return 'gönderildi';
  } catch (e) {
    return 'hata: ' + String(e && e.message ? e.message : e).slice(0, 150);
  }
}

// e-posta başlıklarındaki =?UTF-8?B?...?= / =?UTF-8?Q?...?= kodlamasını çözer
export function baslikCoz(s) {
  return str(s).replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=\s*/g, (_, cs, k, v) => {
    try {
      let b;
      if (k.toUpperCase() === 'B') b = Uint8Array.from(atob(v), (c) => c.charCodeAt(0));
      else { const x = v.replace(/_/g, ' '); const o = []; for (let i = 0; i < x.length; i++) { if (x[i] === '=' && /^[0-9a-f]{2}$/i.test(x.substr(i + 1, 2))) { o.push(parseInt(x.substr(i + 1, 2), 16)); i += 2; } else o.push(x.charCodeAt(i)); } b = new Uint8Array(o); }
      return new TextDecoder(cs.toLowerCase().replace('iso-8859-9', 'windows-1254')).decode(b);
    } catch (e) { return v; }
  });
}
