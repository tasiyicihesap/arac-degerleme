// OTOKABUL — WhatsApp grup köprüsü
// WhatsApp, sunucunun gruplara mesaj atmasına izin vermiyor. Bunun yerine WhatsApp Web açık bir bilgisayardaki
// "OTOKABUL Bildirim Köprüsü" Chrome eklentisi buradan yeni talepleri alır ve gruplara kendisi yazar.
// Birden fazla bilgisayarda açık olsa bile her talep yalnızca bir kez alınır (sunucu tarafında "sahiplenme").
import { simdi, int, str, kes, gizliAyar, ayarlar } from './db.js';
import { mesajAl, mesajSonuc } from './musteri.js';
import { kopruNabiz, dogrulaAl, dogrulaBekle, dogrulaSonuc } from './dogrula.js';
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
  const acil = int(t.acil) > 0;
  const l = [
    acil ? '🚨🚨🚨 *ACİL SATIŞ!* 🚨🚨🚨\n🔴 *Müşteri aracını ACİL satmak istiyor — HEMEN ARAYIN!* 🔴\n' : '',
    `🚗 *${acil ? 'ACİL SAT · TALEP' : '📅 RANDEVU TALEBİ'} #${int(t.id)}*`,
    '━━━━━━━━━━━━━━━━━━',
    `👤 *Müşteri:* ${str(t.ad)}`,
    `📞 *Telefon:* ${str(t.tel)}` + (int(t.tel_dogru) ? ' ✅ _doğrulandı_' : '') + (wa ? `\n💬 *WhatsApp:* ${wa}` : ''),
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
    int(t.foto_sayi) ? `📸 *Fotoğraf:* ${int(t.foto_sayi)} adet (aşağıda)` : '',
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
  if (int(t.acil) > 0) return [
    '🚨🚨🚨 *ACİL SATIŞ TALEBİ!* 🚨🚨🚨',
    '🔴━━━━━━━━━━━━━━━━🔴',
    `🚗 ${arac} · Talep #${int(t.id)}`,
    '⚡ Müşteri aracını *ACİL* satmak istiyor!',
    '📞 *Hemen arayın* — otokabul.com.tr/yonetim',
    '🔴━━━━━━━━━━━━━━━━🔴',
    '_OTOKABUL.COM.TR · otomatik bildirim_ ⚙️',
  ].join('\n');
  return [
    '📅 *RANDEVU TALEBİ VAR!* 🔔',
    '━━━━━━━━━━━━━━━━',
    `🚗 ${arac} · Talep #${int(t.id)}`,
    '👉 Müşteri randevu istedi, aranmayı bekliyor: otokabul.com.tr/yonetim',
    '━━━━━━━━━━━━━━━━',
    '_OTOKABUL.COM.TR · otomatik bildirim_ ⚙️',
  ].join('\n');
}

// randevu istemeyen değerleme: kişisel bilgi yok, kısa haber (iki gruba da)
export function ozetMesaj(t) {
  const arac = [int(t.yil), str(t.marka), str(t.model)].filter(Boolean).join(' ');
  let h = {}; try { h = JSON.parse(t.hasar || '{}') || {}; if (Array.isArray(h)) h = {}; } catch (e) { h = {}; }
  const hs = Object.keys(h).length;
  return [
    `📊 *Değerleme yapıldı* · #${int(t.id)}`,
    `🚗 ${arac}${t.versiyon ? ' ' + str(t.versiyon) : ''}`,
    `🛣️ ${tf(t.km)} km · ${hs ? hs + ' parça boya/değişen' : 'hatasız'}${int(t.tramer) ? ' · tramer ' + tf(t.tramer) + ' TL' : ''}`,
    int(t.teklif_min) ? `💰 Ön teklif: ${tf(t.teklif_min)} – ${tf(t.teklif_max)} TL` : '💰 Otomatik ön teklif verilmedi',
    str(t.il) ? `📍 ${str(t.il)}` : '',
    '_Müşteri randevu isterse detaylı bildirim gelecek._',
  ].filter(Boolean).join('\n');
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
  // manşet görseli (yapay zekâ ile üretilip panele aktarılan): yalnızca site/mansetN
  if (islem === 'gorsel' && req.method === 'POST') {
    let fd; try { fd = await req.formData(); } catch (e) { return json({ hata: 'form' }, 400); }
    const ad = str(fd.get('ad')); const dosya = fd.get('dosya');
    if (!/^(manset|promo|film)\d{1,2}$/.test(ad) || !dosya || typeof dosya === 'string' || !dosya.size || dosya.size > 3 * 1024 * 1024) return json({ hata: 'geçersiz' }, 400);
    const b = new Uint8Array(await dosya.arrayBuffer());
    const uz = b[0] === 0xff && b[1] === 0xd8 ? 'jpg' : b[0] === 0x89 && b[1] === 0x50 ? 'png' : b[8] === 0x57 && b[9] === 0x45 ? 'webp' : null;
    if (!uz) return json({ hata: 'biçim' }, 400);
    const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[uz];
    const P = 1500000; const st = [D.prepare("DELETE FROM gorsel_parca WHERE tur = 'site' AND ad = ?").bind(ad)];
    let sira = 0; for (let i = 0; i < b.length; i += P) st.push(D.prepare("INSERT INTO gorsel_parca(tur, ad, sira, veri) VALUES('site',?,?,?)").bind(ad, sira++, b.slice(i, i + P).buffer));
    st.push(D.prepare("INSERT OR REPLACE INTO gorseller(tur, ad, uz, mime, boyut, parca, zaman) VALUES('site',?,?,?,?,?,?)").bind(ad, uz, mime, b.length, sira, Math.floor(Date.now() / 1000)));
    await D.batch(st);
    return json({ ok: 1 });
  }
  // sahibinden mağaza ilanları (eklenti mağaza sayfasını okuyup gönderir): o mağazada artık olmayanlar pasife alınır
  if (islem === 'ilan_esitle' && req.method === 'POST') {
    let g = {}; try { g = await req.json(); } catch (e) { return json({ hata: 'json' }, 400); }
    const magaza = str(g.magaza).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    const l = (Array.isArray(g.ilanlar) ? g.ilanlar : []).filter((x) => /^\d{6,12}$/.test(str(x.id))).slice(0, 300);
    if (!magaza) return json({ hata: 'mağaza' }, 400);
    if (!l.length && !g.bos) return json({ hata: 'ilan yok' }, 400); // sayfa okunamadıysa mevcut ilanları silme
    const sim = simdi();
    const ops = l.map((x) => D.prepare(`INSERT INTO ilanlar(id, magaza, url, baslik, marka, seri, model, yil, km, renk, fiyat, kategori, foto, ilan_tarihi, ilk_gorulme, son_gorulme, aktif)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?15,1)
      ON CONFLICT(id) DO UPDATE SET magaza=?2, url=?3, baslik=?4, marka=?5, seri=?6, model=?7, yil=CASE WHEN ?8>0 THEN ?8 ELSE yil END, km=CASE WHEN ?9>0 THEN ?9 ELSE km END,
      renk=?10, fiyat=?11, kategori=?12, foto=?13, ilan_tarihi=?14, son_gorulme=?15, aktif=1`).bind(str(x.id), magaza, kes(str(x.url), 300), kes(str(x.baslik), 200),
      kes(str(x.marka), 40), kes(str(x.seri), 60), kes(str(x.model), 80), int(x.yil), int(x.km), kes(str(x.renk), 30), int(x.fiyat), kes(str(x.kategori), 30), kes(str(x.foto), 300), kes(str(x.tarih), 30), sim));
    ops.push(D.prepare(`UPDATE ilanlar SET aktif = 0 WHERE magaza = ? AND aktif = 1 AND id NOT IN (SELECT value FROM json_each(?))`).bind(magaza, JSON.stringify(l.map((x) => str(x.id)))));
    await D.batch(ops);
    return json({ ok: 1, adet: l.length });
  }
  // müşteriye WhatsApp mesajları
  // müşteriye WhatsApp'tan gönderilecek doğrulama kodları
  if (islem === 'dogrula_al') { await kopruNabiz(D).catch(() => {}); return json(int(q('bekle')) ? await dogrulaBekle(D, int(q('bekle'))) : await dogrulaAl(D)); }
  if (islem === 'dogrula_sonuc') { await dogrulaSonuc(D, q('t'), q('s')); return json({ ok: 1 }); }
  if (islem === 'nabiz') { await kopruNabiz(D); return json({ ok: 1 }); }
  if (islem === 'mesaj_al') return json(await mesajAl(D, await ayarlar(D)));
  if (islem === 'mesaj_sonuc' && id) { await mesajSonuc(D, id, q('s'), q('not')); return json({ ok: 1 }); }
  if (islem === 'onay' && id) {
    await D.prepare("UPDATE talepler SET grup_durum = ?, acil = CASE WHEN acil IN (1, 3) THEN 2 ELSE acil END, grup_tam = CASE WHEN grup_tam = 2 THEN 1 ELSE grup_tam END WHERE id = ?").bind('gönderildi ' + simdi(), id).run();
    return json({ ok: 1 });
  }
  if (islem === 'foto' && id) { // talep fotoğrafı (gruba iletmek için)
    const f = await D.prepare('SELECT mime, veri FROM talep_foto WHERE id = ?').bind(id).first();
    if (!f) return json({ hata: 'yok' }, 404);
    return new Response(new Uint8Array(f.veri), { headers: { 'Content-Type': f.mime, 'Cache-Control': 'no-store' } });
  }
  if (islem === 'iade' && id) {
    await D.prepare("UPDATE talepler SET grup_durum = '', grup_tam = CASE WHEN grup_tam = 2 THEN 0 ELSE grup_tam END WHERE id = ? AND grup_durum LIKE 'alındı%'").bind(id).run();
    return json({ ok: 1 });
  }
  // doğrulama kodlarını okuyabilen eklenti sürümü (dg=1) her turda yaşadığını bildirir
  if (q('dg') === '2') await kopruNabiz(D).catch(() => {});
  // al: fotoğraflar yüklensin diye en az 90 sn eski talepler; 10 dk içinde onaylanmayan sahiplenme tekrar alınabilir
  const simd = simdi(), esik = simdi(Date.now() - 90e3), zaman = simdi(Date.now() - 600e3);
  // randevu istendiyse ya da acil ise detaylı bildirim (grup_tam 2 = detaylı gönderiliyor, 1 = detaylı gönderildi);
  // aksi halde sadece kısa "değerleme yapıldı" mesajı
  const { results } = await D.prepare(`UPDATE talepler SET grup_durum = 'alındı ' || ?1,
      grup_tam = CASE WHEN (kabul_tarih IS NOT NULL AND kabul_tarih <> '') OR acil > 0 THEN CASE WHEN grup_tam = 1 THEN 1 ELSE 2 END ELSE grup_tam END
    WHERE id IN (SELECT id FROM talepler WHERE tarih <= ?2 AND (grup_durum = '' OR grup_durum IS NULL OR (grup_durum LIKE 'alındı %' AND substr(grup_durum, 8) < ?3)) ORDER BY id LIMIT 5)
    RETURNING id, tarih, ad, tel, il, marka, model, yil, versiyon, yakit, vites, kasa, km, renk, hasar, tramer, agir, teklif_min, teklif_max, donanim, aciklama, foto_sayi, kabul_tarih, acil, tel_dogru, grup_tam`)
    .bind(simd, esik, zaman).all();
  results.sort((x, y) => x.id - y.id);
  const fotolar = {};
  if (results.length) {
    const { results: fl } = await D.prepare(`SELECT id, talep_id FROM talep_foto WHERE talep_id IN (${results.map(() => '?').join(',')}) ORDER BY id`).bind(...results.map((t) => t.id)).all();
    for (const f of fl) (fotolar[f.talep_id] = fotolar[f.talep_id] || []).push(int(f.id));
  }
  return json({ talepler: results.map((t) => {
    const detay = (str(t.kabul_tarih) !== '' || int(t.acil) > 0);
    if (!detay) { const o = ozetMesaj(t); return { id: int(t.id), tam: o, kisa: o, fotolar: [] }; }
    // acil uyarısı, detaylı bildirim daha önce gittiyse fotoğrafsız tekrar gönderilir
    return { id: int(t.id), tam: tamMesaj(t), kisa: kisaMesaj(t), fotolar: int(t.acil) === 1 && int(t.grup_tam) === 1 ? [] : fotolar[t.id] || [] };
  }) });
}
