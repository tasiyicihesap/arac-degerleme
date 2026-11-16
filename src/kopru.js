// OTOKABUL — WhatsApp grup köprüsü
// WhatsApp, sunucunun gruplara mesaj atmasına izin vermiyor. Bunun yerine WhatsApp Web açık bir bilgisayardaki
// "OTOKABUL Bildirim Köprüsü" Chrome eklentisi buradan yeni talepleri alır ve gruplara kendisi yazar.
// Birden fazla bilgisayarda açık olsa bile her talep yalnızca bir kez alınır (sunucu tarafında "sahiplenme").
import { simdi, int, str, kes, gizliAyar } from './db.js';
import { json, rastgeleHex } from './yardim.js';
import { PARCALAR, DURUMLAR } from './fiyat.js';

const tf = (n) => new Intl.NumberFormat('tr-TR').format(int(n));
const telLink = (t) => {
  let d = str(t).replace(/\D/g, '');
  if (d.startsWith('0')) d = '9' + d; else if (d.length === 10) d = '90' + d;
  return d.length >= 11 ? 'https://wa.me/' + d : '';
};
const tarihTR = (t) => { const s = str(t); return s.length >= 16 ? `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)} ${s.slice(11, 16)}` : s; };

// firma sahipleri grubu: tüm bilgiler, gizlemesiz
export function tamMesaj(t) {
  let h = {}, dn = [];
  try { h = JSON.parse(t.hasar || '{}') || {}; if (Array.isArray(h)) h = {}; } catch (e) { h = {}; }
  try { dn = t.donanim ? JSON.parse(t.donanim) : []; } catch (e) { dn = []; }
  const hs = Object.keys(h).map((p) => `   ▫️ ${PARCALAR[p] || p}: ${DURUMLAR[h[p]] || h[p]}`);
  const arac = [int(t.yil), str(t.marka), str(t.model)].filter(Boolean).join(' ');
  const wa = telLink(t.tel);
  const l = [
    `🚗 *YENİ TEKLİF TALEBİ #${int(t.id)}*`,
    '━━━━━━━━━━━━━━━━━━',
    `👤 *Müşteri:* ${str(t.ad)}`,
    `📞 *Telefon:* ${str(t.tel)}` + (wa ? `\n💬 *WhatsApp:* ${wa}` : ''),
    `📍 *İl:* ${str(t.il) || '—'}`,
    '',
    `🚘 *Araç:* ${arac}`,
    t.versiyon ? `🔧 *Paket:* ${str(t.versiyon)}` : '',
    `⛽ ${[t.yakit, t.vites, t.kasa, t.renk].map(str).filter(Boolean).join(' · ')}`,
    `🛣️ *Kilometre:* ${tf(t.km)} km`,
    `🎨 *Boya / değişen:* ${hs.length ? '\n' + hs.join('\n') : 'Yok (hatasız)'}`,
    `💥 *Tramer:* ${int(t.tramer) ? tf(t.tramer) + ' TL' : 'Yok'}${int(t.agir) ? '  ⚠️ *AĞIR HASAR KAYDI VAR*' : ''}`,
    dn.length ? `🧰 *Donanım:* ${dn.map(str).join(', ')}` : '',
    t.aciklama ? `📝 *Müşteri notu:* ${kes(str(t.aciklama), 500)}` : '',
    int(t.foto_sayi) ? `📸 *Fotoğraf:* ${int(t.foto_sayi)} adet (panelde)` : '',
    '',
    int(t.teklif_min) ? `💰 *Ön teklif:* ${tf(t.teklif_min)} – ${tf(t.teklif_max)} TL` : '💰 *Ön teklif:* otomatik verilmedi (uzman değerlendirecek)',
    t.kabul_tarih ? '✅ *Müşteri randevu istedi*' : '',
    `🕒 ${tarihTR(t.tarih)}`,
    '━━━━━━━━━━━━━━━━━━',
    '🔗 otokabul.com.tr/yonetim',
  ];
  return l.filter((x) => x !== '').join('\n').replace(/\n{3,}/g, '\n\n');
}

// genel ekip grubu: kişisel bilgi yok, sadece haber
export function kisaMesaj(t) {
  const arac = [int(t.yil), str(t.marka), str(t.model)].filter(Boolean).join(' ');
  return [
    '🔔 *YENİ BİR TALEP VAR!* 🔔',
    '━━━━━━━━━━━━━━━━',
    `🚗 ${arac} · Talep #${int(t.id)}`,
    '👉 Siteyi kontrol edin: otokabul.com.tr/yonetim',
    '━━━━━━━━━━━━━━━━',
    '_OTOKABUL.COM.TR · otomatik bildirim_ ⚙️',
  ].join('\n');
}

export async function kopruAnahtari(D, yenile) {
  let a = await gizliAyar(D, '_kopru_anahtar');
  if (!a || yenile) {
    a = rastgeleHex(20);
    await D.prepare("INSERT INTO ayarlar(k, v) VALUES('_kopru_anahtar', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(a).run();
  }
  return a;
}

// /api.php?a=kopru&islem=al|onay|iade&anahtar=…
export async function kopru(req, D) {
  const url = new URL(req.url);
  const q = (k) => url.searchParams.get(k) ?? '';
  const a = await gizliAyar(D, '_kopru_anahtar');
  if (!a || q('anahtar') !== a) return json({ hata: 'yetkisiz' }, 401);
  const islem = q('islem');
  const id = int(q('id'));
  if (islem === 'onay' && id) {
    await D.prepare("UPDATE talepler SET grup_durum = ? WHERE id = ?").bind('gönderildi ' + simdi(), id).run();
    return json({ ok: 1 });
  }
  if (islem === 'iade' && id) {
    await D.prepare("UPDATE talepler SET grup_durum = '' WHERE id = ? AND grup_durum LIKE 'alındı%'").bind(id).run();
    return json({ ok: 1 });
  }
  // al: fotoğraflar yüklensin diye en az 90 sn eski talepler; 10 dk içinde onaylanmayan sahiplenme tekrar alınabilir
  const simd = simdi(), esik = simdi(Date.now() - 90e3), zaman = simdi(Date.now() - 600e3);
  const { results } = await D.prepare(`UPDATE talepler SET grup_durum = 'alındı ' || ?1
    WHERE id IN (SELECT id FROM talepler WHERE tarih <= ?2 AND (grup_durum = '' OR grup_durum IS NULL OR (grup_durum LIKE 'alındı %' AND substr(grup_durum, 8) < ?3)) ORDER BY id LIMIT 5)
    RETURNING id, tarih, ad, tel, il, marka, model, yil, versiyon, yakit, vites, kasa, km, renk, hasar, tramer, agir, teklif_min, teklif_max, donanim, aciklama, foto_sayi, kabul_tarih`)
    .bind(simd, esik, zaman).all();
  results.sort((x, y) => x.id - y.id);
  return json({ talepler: results.map((t) => ({ id: int(t.id), tam: tamMesaj(t), kisa: kisaMesaj(t) })) });
}
