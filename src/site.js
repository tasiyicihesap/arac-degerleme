// OTOKABUL — müşteri sitesi API'si (eski api.php)
import { dogrulaBaslat, dogrulaDurum, dogrulaKod, dogrulaKarar, dogrulaTalepYaz, dogrulamaGerekli } from './dogrula.js';
import { kasaBul, modelKasasi } from './kasa.js';
import { izKaydet } from './istatistik.js';
import { kopru } from './kopru.js';
import { takipPlanla, kabulPlanla } from './musteri.js';
import { YAZILAR } from './rehber.js';
import { db, ayarlar, VARSAYILAN_AYARLAR, simdi, int, str, kes, dolu, buYil, gorselHaritasi, logoUrl, modelGorselUrl, donanimlar } from './db.js';
import { teklifHesapla, PARCALAR, DURUMLAR } from './fiyat.js';
import { json, rastgeleHex } from './yardim.js';

// sitede yalnızca Manuel / Otomatik: yarı otomatik (robotize) şanzımanlar Otomatik sayılır
const vitesN = (v) => (str(v) === 'Yarı Otomatik' ? 'Otomatik' : str(v));
const hizmetIlleri = (A) => str(A.hizmet_illeri).split(',').map((x) => x.trim()).filter(Boolean);
import { epostaGonder, anlikBildir } from './bildirim.js';

// Sık okunan, nadiren değişen cevaplar bellekte ve Cloudflare önbelleğinde tutulur (ücretsiz plandaki günlük okuma kotası için)
const ONBELLEK_SURE = { firma: 60, metinler: 60, site_gorselleri: 60, markalar: 600, markayillar: 600, yilmodeller: 600, secenekler: 600, modeller: 600, yillar: 600, versiyonlar: 600 };
const bellek = new Map();

export async function siteApi(req, env, ctx) {
  const sure = req.method === 'GET' ? ONBELLEK_SURE[new URL(req.url).searchParams.get('a')] : 0;
  if (!sure) return siteApiIc(req, env, ctx);
  const anahtar = new URL(req.url); anahtar.searchParams.delete('_');
  const k = anahtar.toString();
  const b = bellek.get(k);
  if (b && b.son > Date.now()) return new Response(b.govde, { headers: b.basliklar });
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) { try { const c = await cache.match(k); if (c) return c; } catch (e) {} }
  const r = await siteApiIc(req, env, ctx);
  if (r.status !== 200) return r;
  const govde = await r.text();
  const basliklar = { 'Content-Type': r.headers.get('Content-Type') || 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=' + Math.min(sure, 60) };
  if (bellek.size > 2000) bellek.clear();
  bellek.set(k, { govde, basliklar, son: Date.now() + sure * 1000 });
  if (cache && ctx) ctx.waitUntil(cache.put(k, new Response(govde, { headers: { ...basliklar, 'Cache-Control': 'public, max-age=' + sure } })).catch(() => {}));
  return new Response(govde, { headers: basliklar });
}

async function siteApiIc(req, env, ctx) {
  const arkada = (p) => (ctx && ctx.waitUntil ? ctx.waitUntil(p.catch((e) => console.error(e))) : p);
  const url = new URL(req.url);
  const q = (k) => url.searchParams.get(k) ?? '';
  const a = q('a');
  let D;
  try { D = await db(env); } catch (e) { if (a !== 'mesaj') throw e; D = env.DB; }
  switch (a) {
    case 'iz': return izKaydet(req, env, ctx, D); // site istatistikleri
    case 'kopru': return kopru(req, D); // WhatsApp grup köprüsü (Chrome eklentisi)
    case 'firma': {
      const A = await ayarlar(D);
      return json({ ad: A.firma_adi, alt: A.firma_alt, telefon: A.telefon, whatsapp: A.whatsapp, eposta: A.eposta, adres: A.adres, teklif_goster: A.teklif_goster === '1', iller: hizmetIlleri(A),
        donanimlar: donanimlar(A).map((d) => ({ ad: d.ad, kosul: d.kosul })) });
    }
    case 'rehber_son': return json([...YAZILAR].sort((a, b) => (a.tarih < b.tarih ? 1 : -1)).slice(0, 3).map((y) => ({ slug: y.slug, baslik: y.baslik, ozet: y.ozet, tarih: y.tarih })), 200, { 'Cache-Control': 'public, max-age=600' });
    case 'satistaki': { // sahibinden mağazalarımızdaki satıştaki araçlar
      const { results } = await D.prepare('SELECT id, url, baslik, marka, seri, model, yil, km, renk, fiyat, kategori, foto, ilan_tarihi FROM ilanlar WHERE aktif = 1 ORDER BY ilk_gorulme DESC, id DESC LIMIT 60').all();
      return json(results, 200, { 'Cache-Control': 'public, max-age=300' });
    }
    case 'son_degerlemeler': { // ana sayfadaki "son değerlemeler" şeridi: kişisel bilgi yok
      const { results } = await D.prepare("SELECT tarih, yil, marka, model, il FROM talepler WHERE ad NOT LIKE 'TEST%' ORDER BY id DESC LIMIT 14").all();
      const simdiMs = Date.parse(simdi().replace(' ', 'T') + 'Z');
      return json(results.map((r) => ({ arac: `${int(r.yil)} ${str(r.marka)} ${str(r.model)}`, il: str(r.il), dk: Math.max(0, Math.round((simdiMs - Date.parse(str(r.tarih).replace(' ', 'T') + 'Z')) / 60000)) })), 200, { 'Cache-Control': 'public, max-age=120' });
    }
    case 'metinler': { // panelden değiştirilen site cümleleri
      const { results } = await D.prepare('SELECT k, v FROM metinler').all();
      const o = {}; for (const r of results) o[r.k] = r.v;
      return json(o, 200, { 'Cache-Control': 'public, max-age=60' });
    }
    case 'site_gorselleri': {
      const h = await gorselHaritasi(D); const o = {};
      for (const [k, v] of Object.entries(h)) if (k.startsWith('site/')) o[k.slice(5)] = v;
      return json(o, 200, { 'Cache-Control': 'public, max-age=60' });
    }
    case 'markalar': {
      const [{ results }, h] = await Promise.all([D.prepare('SELECT marka, SUM(adet) n, COUNT(*) c FROM fiyatlar WHERE aktif = 1 GROUP BY marka ORDER BY n DESC').all(), gorselHaritasi(D)]);
      return json(results.map((x) => ({ ad: x.marka, n: int(x.n), logo: logoUrl(h, x.marka) })));
    }
    case 'markayillar': {
      const { results } = await D.prepare('SELECT model, MIN(yil) a, MAX(yil) b FROM fiyatlar WHERE aktif = 1 AND marka = ? GROUP BY model').bind(q('marka')).all();
      const y = new Set(); const son = buYil() + 1;
      for (const r of results) for (let i = int(r.a); i <= Math.min(son, int(r.b)); i++) y.add(i);
      return json([...y].sort((p, r) => r - p));
    }
    case 'yilmodeller': {
      const marka = q('marka'), yil = int(q('yil'));
      const [{ results }, h] = await Promise.all([
        D.prepare(`SELECT f.model, SUM(CASE WHEN f.yil = ?2 THEN f.adet ELSE 0 END) adet, MIN(f.yil) a, MAX(f.yil) b, MIN(ABS(f.yil - ?2)) uzak,
            (SELECT kasa FROM katalog k WHERE k.marka = ?1 AND k.model = f.model AND k.kasa <> '' GROUP BY kasa ORDER BY COUNT(*) DESC LIMIT 1) kasa
          FROM fiyatlar f WHERE f.aktif = 1 AND f.marka = ?1 GROUP BY f.model HAVING a <= ?2 AND b >= ?2 AND uzak <= 3 ORDER BY f.model COLLATE NOCASE`).bind(marka, yil).all(),
        gorselHaritasi(D),
      ]);
      return json(results.map((x) => ({ ad: x.model, n: int(x.adet), gorsel: modelGorselUrl(h, marka, x.model), kasa: modelKasasi(marka, x.model) || x.kasa || '' })));
    }
    case 'secenekler': {
      const yol = `$."${int(q('yil'))}"`;
      const { results } = await D.prepare(`SELECT id, versiyon, tip, kasa, yakit, vites, motor, beygir FROM katalog
        WHERE aktif = 1 AND marka = ? AND model = ? AND json_extract(degerler, ?) IS NOT NULL ORDER BY versiyon COLLATE NOCASE`).bind(q('marka'), q('model'), yol).all();
      return json(results.map((x) => ({ id: int(x.id), ad: x.versiyon, kasa: kasaBul(q('marka'), q('model'), x.tip + ' ' + x.versiyon, x.kasa), yakit: x.yakit, vites: vitesN(x.vites), motor: x.motor, beygir: int(x.beygir) })));
    }
    // o yıla ait katalog yoksa sihirbazın kasa / yakıt / vites listeleri modelin tüm yıllarından gelir
    case 'ozellik': {
      const marka = q('marka'), model = q('model');
      const { results } = await D.prepare('SELECT tip, versiyon, kasa, yakit, vites FROM katalog WHERE aktif = 1 AND marka = ? AND model = ?').bind(marka, model).all();
      const say = (f) => { const m = {}; for (const x of results) { const v = f(x); if (v) m[v] = (m[v] || 0) + 1; } return Object.keys(m).sort((a, b) => m[b] - m[a]); };
      let kasa = say((x) => kasaBul(marka, model, x.tip + ' ' + x.versiyon, x.kasa)).filter((k) => k !== 'Diğer');
      if (!kasa.length && modelKasasi(marka, model)) kasa = [modelKasasi(marka, model)];
      return json({ kasa, yakit: say((x) => x.yakit), vites: say((x) => vitesN(x.vites)) });
    }
    case 'modeller': {
      const { results } = await D.prepare('SELECT model, SUM(adet) n, MIN(yil) y1, MAX(yil) y2 FROM fiyatlar WHERE aktif = 1 AND marka = ? GROUP BY model ORDER BY model COLLATE NOCASE').bind(q('marka')).all();
      return json(results.map((x) => ({ ad: x.model, n: int(x.n), y1: int(x.y1), y2: int(x.y2) })));
    }
    case 'yillar': {
      const r = await D.prepare('SELECT MIN(yil) y1, MAX(yil) y2 FROM fiyatlar WHERE aktif = 1 AND marka = ? AND model = ?').bind(q('marka'), q('model')).first();
      const y2 = Math.max(int(r && r.y2), 0), y1 = int(r && r.y1); const l = [];
      if (y2) for (let y = Math.min(buYil() + 1, y2 + 1); y >= Math.max(1980, y1 - 2); y--) l.push(y);
      return json(l);
    }
    case 'versiyonlar': {
      const r = await D.prepare('SELECT liste FROM versiyonlar WHERE marka = ? AND model = ?').bind(q('marka'), q('model')).first();
      return json(r ? JSON.parse(r.liste) : []);
    }
    case 'dogrula_baslat': {
      if (req.method !== 'POST') return json({ hata: 'POST gerekli' }, 405);
      let g = {}; try { g = (await req.json()) || {}; } catch (e) {}
      const r = await dogrulaBaslat(D, await ayarlar(D), req.headers.get('CF-Connecting-IP') || '', g && g.tel, !!(g && g.yeniden));
      return json(r, r.hata ? 400 : 200);
    }
    case 'dogrula_durum': return json(await dogrulaDurum(D, q('t')));
    case 'dogrula_kod': {
      if (req.method !== 'POST') return json({ hata: 'POST gerekli' }, 405);
      let g = {}; try { g = (await req.json()) || {}; } catch (e) {}
      const r = await dogrulaKod(D, g && g.token, g && g.kod);
      return json(r, r.hata ? 400 : 200);
    }
    case 'teklif': {
      if (req.method !== 'POST') return json({ hata: 'POST gerekli' }, 405);
      let g = {}; try { g = (await req.json()) || {}; } catch (e) {}
      if (typeof g !== 'object' || Array.isArray(g)) g = {};
      const ad = kes(str(g.ad).trim(), 80).trim();
      let tel = str(g.tel).replace(/[^\d+]/g, '');
      if (ad === '' || tel.replace(/\D/g, '').length < 10) return json({ hata: 'Ad ve geçerli bir telefon numarası gerekli.' }, 400);
      // telefon doğrulama: WhatsApp'tan kod gönderilerek doğrulanan numara esas alınır
      let telDogru = 0;
      {
        const dk = await dogrulaKarar(D, g.dogrula);
        if (dk && dk.onceki) { try { return json(JSON.parse(dk.onceki)); } catch (e) {} } // aynı doğrulamayla ikinci talep açılmaz
        if (dk && dk.dogru) { tel = '0' + dk.tel; telDogru = 1; }
        else if (!dk && await dogrulamaGerekli(D, await ayarlar(D))) return json({ hata: 'Devam etmek için telefon numaranı doğrulaman gerekiyor.', dogrula: 1 }, 400);
      }
      {
        const iller = hizmetIlleri(await ayarlar(D));
        if (iller.length && !iller.includes(str(g.il).trim())) return json({ hata: `Şu an yalnızca ${iller.join(', ')} illerinden araç alıyoruz. Bölgemiz genişlediğinde seni de ağırlamaktan memnuniyet duyarız.`, bolge: 1 }, 400);
      }
      const telN = tel.replace(/\D/g, '').slice(-10);
      const AK = await ayarlar(D);
      const muaf = str(AK.sorgu_muaf).split(',').map((x) => x.replace(/\D/g, '').slice(-10)).filter(Boolean).includes(telN);
      if (!muaf) {
        const kisit = await D.prepare('SELECT bitis FROM tel_kisit WHERE tel = ? AND bitis > ?').bind(telN, simdi()).first();
        if (kisit) {
          const b = str(kisit.bitis);
          return json({ hata: `Bu numarayla kısa sürede çok sayıda değerleme yapıldığı için ${b.slice(8, 10)}.${b.slice(5, 7)}.${b.slice(0, 4)} tarihine kadar yeni değerleme yapılamıyor. Aracınız için bizi ${str(AK.telefon) || 'telefonla'} arayabilirsiniz; memnuniyetle yardımcı oluruz.`, kisit: 1 }, 429);
        }
        const bugunN = await D.prepare('SELECT COUNT(*) n FROM talepler WHERE tel_n = ? AND substr(tarih, 1, 10) = ?').bind(telN, simdi().slice(0, 10)).first();
        const limit = Math.max(1, int(AK.sorgu_gunluk) || 3);
        if (int(bugunN.n) >= limit) return json({ hata: `Bir telefon numarasıyla günde en fazla ${limit} değerleme yapılabiliyor. Yarın tekrar deneyebilir ya da bizi ${str(AK.telefon) || 'telefonla'} arayabilirsiniz.`, kisit: 1 }, 429);
      }
      // aynı numaranın önceki talebi (teklif sayfasında hatırlatma için)
      const onceki = await D.prepare('SELECT marka, model, yil, teklif_min, teklif_max, tarih FROM talepler WHERE tel_n = ? ORDER BY id DESC LIMIT 1').bind(telN).first();
      const ip = req.headers.get('CF-Connecting-IP') || '';
      const c = await D.prepare('SELECT COUNT(*) n FROM talepler WHERE ip = ? AND tarih > ?').bind(ip, simdi(Date.now() - 3600 * 1000)).first();
      if (int(c.n) >= 15) return json({ hata: 'Çok fazla talep gönderildi, lütfen bizi telefonla arayın.' }, 429);

      const hasar = {};
      const hg = g.hasar && typeof g.hasar === 'object' ? g.hasar : {};
      for (const [p, d] of Object.entries(hg)) if (PARCALAR[p] && typeof d === 'string' && DURUMLAR[d] && d !== 'orijinal') hasar[p] = d;
      g.hasar = hasar;
      const A = await ayarlar(D);
      const dl = donanimlar(A).map((d) => d.ad);
      g.donanim = Array.isArray(g.donanim) ? [...new Set(g.donanim.map(str).filter((x) => dl.includes(x)))] : [];
      const s = await teklifHesapla(D, g, A);
      const anahtar = rastgeleHex(12);
      const r = await D.prepare(`INSERT INTO talepler(tarih, ad, tel, il, marka, model, yil, versiyon, yakit, vites, kasa, km, renk, hasar, tramer, agir, baz, teklif_min, teklif_max, detay, ip, anahtar, donanim, aciklama, tel_n, tel_dogru)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(simdi(), ad, tel, kes(g.il, 40), str(g.marka), str(g.model), int(g.yil),
        kes(g.versiyon, 80), str(g.yakit), str(g.vites), str(g.kasa), int(g.km), kes(g.renk, 30), Object.keys(hasar).length ? JSON.stringify(hasar) : '[]',
        int(g.tramer), dolu(g.agir) ? 1 : 0, s.baz, s.min, s.max, JSON.stringify(s), ip, anahtar, g.donanim.length ? JSON.stringify(g.donanim) : '', kes(str(g.aciklama).trim(), 1500), telN, telDogru).run();
      const no = int(r.meta.last_row_id);
      arkada(takipPlanla(D, A, no, telN).catch(() => {}));
      // 10 gün içinde 3 gün peş peşe değerleme → kısıt: 3 gün, sonra 1 hafta, sonra 10 gün
      if (!muaf) arkada((async () => {
        const gunler = (await D.prepare("SELECT DISTINCT substr(tarih, 1, 10) g FROM talepler WHERE tel_n = ? AND tarih >= ? ORDER BY g DESC").bind(telN, simdi(Date.now() - 10 * 864e5).slice(0, 10)).all()).results.map((x) => x.g);
        const gun = (n) => simdi(Date.now() - n * 864e5).slice(0, 10);
        if (gunler.includes(gun(0)) && gunler.includes(gun(1)) && gunler.includes(gun(2))) {
          const k = await D.prepare('SELECT seviye, son FROM tel_kisit WHERE tel = ?').bind(telN).first();
          const eskiSeviye = k && str(k.son) > simdi(Date.now() - 60 * 864e5) ? int(k.seviye) : 0;
          const seviye = Math.min(3, eskiSeviye + 1), sure = [3, 7, 10][seviye - 1];
          await D.prepare('INSERT INTO tel_kisit(tel, bitis, seviye, son) VALUES(?1, ?2, ?3, ?4) ON CONFLICT(tel) DO UPDATE SET bitis = ?2, seviye = ?3, son = ?4')
            .bind(telN, simdi(Date.now() + sure * 864e5), seviye, simdi()).run();
        }
      })());
      if (A.bildirim_talep === '1') {
        const tf = (n) => new Intl.NumberFormat('tr-TR').format(n);
        const hs = Object.keys(hasar).length;
        const ozet = `Yeni teklif talebi #${no}\n${ad} — ${tel}\n${str(g.marka)} ${str(g.model)} ${int(g.yil)} ${kes(g.versiyon, 80)}\n${tf(int(g.km))} km · ${hs ? hs + ' parça boya/değişen' : 'hatasız'}${int(g.tramer) ? ' · tramer ' + tf(int(g.tramer)) + ' TL' : ''}\nTeklif: ${s.min ? tf(s.min) + ' – ' + tf(s.max) + ' TL' : 'otomatik teklif yok'}`;
        arkada(Promise.all([
          epostaGonder(env, A, { konu: `Yeni teklif talebi #${no}: ${str(g.marka)} ${str(g.model)} ${int(g.yil)}`, metin: ozet + '\n\nDetaylar yönetim panelinde, Teklif Talepleri bölümünde.' }),
          anlikBildir(A, '🚗 ' + ozet),
        ]));
      }
      if (A.teklif_goster !== '1' && s.durum === 'ok') { s.durum = 'gizli'; s.min = s.max = 0; s.mesaj = 'Talebiniz alındı. Uzmanımız teklifimizle birlikte kısa süre içinde sizi arayacak.'; }
      let onc = null;
      if (onceki) {
        const ayni = str(onceki.marka) === str(g.marka) && str(onceki.model) === str(g.model) && int(onceki.yil) === int(g.yil);
        onc = { arac: `${int(onceki.yil)} ${str(onceki.marka)} ${str(onceki.model)}`, tarih: str(onceki.tarih).slice(0, 10), ayni, min: ayni && A.teklif_goster === '1' ? int(onceki.teklif_min) : 0, max: ayni && A.teklif_goster === '1' ? int(onceki.teklif_max) : 0 };
      }
      const yanit = { no, anahtar, durum: s.durum, min: s.min, max: s.max, mesaj: s.mesaj, onceki: onc };
      await dogrulaTalepYaz(D, g.dogrula, yanit).catch(() => {});
      return json(yanit);
    }
    case 'mesaj': { // ana sayfadaki iletişim formu
      if (req.method !== 'POST') return json({ hata: 'POST gerekli' }, 405);
      let g = {}; try { g = (await req.json()) || {}; } catch (e) {}
      if (typeof g !== 'object' || Array.isArray(g)) g = {};
      if (str(g.web) !== '') return json({ ok: 1 }); // bot tuzağı
      const ad = kes(str(g.ad).trim(), 80).trim();
      const tel = kes(str(g.tel).replace(/[^\d+]/g, ''), 20);
      const eposta = kes(str(g.eposta).trim(), 120);
      const mesaj = kes(str(g.mesaj).trim(), 2000).trim();
      if (ad === '') return json({ hata: 'Lütfen adını yaz.' }, 400);
      if (tel.replace(/\D/g, '').length < 10 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) return json({ hata: 'Sana dönebilmemiz için telefon ya da e-posta adresi gerekli.' }, 400);
      if (eposta && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) return json({ hata: 'E-posta adresi geçersiz görünüyor.' }, 400);
      if (Array.from(mesaj).length < 5) return json({ hata: 'Lütfen mesajını yaz.' }, 400);
      const ip = req.headers.get('CF-Connecting-IP') || '';
      // veritabanına ulaşılamasa bile mesaj e-posta ve WhatsApp ile yine gönderilir
      let id = 0, A = { ...VARSAYILAN_AYARLAR };
      try {
        const c = await D.prepare("SELECT COUNT(*) n FROM mesajlar WHERE kaynak = 'form' AND ip = ? AND tarih > ?").bind(ip, simdi(Date.now() - 3600 * 1000)).first();
        if (int(c.n) >= 5) return json({ hata: 'Çok fazla mesaj gönderildi, lütfen bizi telefonla ara.' }, 429);
        const r = await D.prepare("INSERT INTO mesajlar(tarih, kaynak, ad, tel, eposta, konu, mesaj, ip) VALUES(?, 'form', ?, ?, ?, 'Site iletişim formu', ?, ?)").bind(simdi(), ad, tel, eposta, mesaj, ip).run();
        id = int(r.meta.last_row_id);
        A = await ayarlar(D);
      } catch (e) { console.error('mesaj kaydı', e); }
      const bilgi = `${ad}${tel ? '\nTelefon: ' + tel : ''}${eposta ? '\nE-posta: ' + eposta : ''}`;
      arkada((async () => {
        const [ed, wd] = await Promise.all([
          epostaGonder(env, A, { konu: 'Siteden yeni mesaj: ' + ad, metin: `Siteden yeni mesaj var.\n\n${bilgi}\n\nMesaj:\n${mesaj}\n\nBu e-postayı yanıtlarsan cevabın doğrudan müşteriye gider${eposta ? '' : ' (müşteri e-posta yazmadı, telefonla dönmen gerekiyor)'}.`, yanitla: eposta }),
          anlikBildir(A, `✉️ Siteden yeni mesaj\n${bilgi}\n\n${kes(mesaj, 600)}`),
        ]);
        if (id) await D.prepare('UPDATE mesajlar SET eposta_durum = ?, wa_durum = ? WHERE id = ?').bind(ed, wd, id).run();
      })());
      return json({ ok: 1 });
    }
    case 'randevu': {
      if (req.method !== 'POST') return json({ hata: 'POST gerekli' }, 405);
      let g = {}; try { g = (await req.json()) || {}; } catch (e) {}
      const t = await D.prepare('SELECT id, kabul_tarih, tel_n FROM talepler WHERE id = ? AND anahtar = ?').bind(int(g.no), str(g.anahtar ?? '-') || '-').first();
      if (!t) return json({ hata: 'Talep bulunamadı. Lütfen bizi telefonla arayın.' }, 404);
      if (!t.kabul_tarih) {
        // randevu: gruplara detaylı bildirim gitsin (kısa özet daha önce gittiyse yeniden sıraya alınır)
        await D.prepare("UPDATE talepler SET durum = 'Randevu İstedi', kabul_tarih = ?, grup_durum = CASE WHEN grup_durum LIKE 'gönderildi%' AND grup_tam <> 1 THEN '' ELSE grup_durum END WHERE id = ?").bind(simdi(), t.id).run();
        await kabulPlanla(D, await ayarlar(D), t.id, str(t.tel_n)).catch(() => {});
      }
      return json({ ok: 1 });
    }
    case 'acil': { // müşteri "ACİL SAT" dedi: gruplara kırmızı uyarı (eklenti), sahibine anlık bildirim
      if (req.method !== 'POST') return json({ hata: 'POST gerekli' }, 405);
      let g = {}; try { g = (await req.json()) || {}; } catch (e) {}
      const t = await D.prepare('SELECT id, ad, tel, marka, model, yil, acil, grup_durum, kabul_tarih, tel_n FROM talepler WHERE id = ? AND anahtar = ?').bind(int(g.no), str(g.anahtar ?? '-') || '-').first();
      if (!t) return json({ hata: 'Talep bulunamadı. Lütfen bizi telefonla arayın.' }, 404);
      if (!int(t.acil)) {
        const gonderildi = str(t.grup_durum).startsWith('gönderildi');
        await D.prepare("UPDATE talepler SET acil = ?, durum = 'ACİL SAT', kabul_tarih = COALESCE(kabul_tarih, ?), grup_durum = CASE WHEN grup_durum LIKE 'gönderildi%' THEN '' ELSE grup_durum END WHERE id = ?")
          .bind(gonderildi ? 1 : 3, simdi(), t.id).run();
        const A = await ayarlar(D);
        if (!t.kabul_tarih) await kabulPlanla(D, A, t.id, str(t.tel_n)).catch(() => {});
        arkada(anlikBildir(A, `🚨 ACİL SAT! Talep #${t.id}\n${str(t.ad)} — ${str(t.tel)}\n${int(t.yil)} ${str(t.marka)} ${str(t.model)}\nMüşteri aracını acil satmak istiyor, hemen arayın.`));
      }
      return json({ ok: 1 });
    }
    case 'foto': { // talebe fotoğraf (tarayıcıda küçültülmüş), talep başına en fazla 10
      if (req.method !== 'POST') return json({ hata: 'POST gerekli' }, 405);
      let fd; try { fd = await req.formData(); } catch (e) { return json({ hata: 'Dosya gerekli.' }, 400); }
      const t = await D.prepare('SELECT id, foto_sayi FROM talepler WHERE id = ? AND anahtar = ?').bind(int(fd.get('no')), str(fd.get('anahtar')) || '-').first();
      if (!t) return json({ hata: 'Talep bulunamadı.' }, 404);
      const sayi = await D.prepare('SELECT COUNT(*) n FROM talep_foto WHERE talep_id = ?').bind(t.id).first();
      if (int(sayi.n) >= 10) return json({ hata: 'En fazla 10 fotoğraf eklenebilir.' }, 400);
      const dosya = fd.get('dosya');
      if (!dosya || typeof dosya === 'string' || !dosya.size) return json({ hata: 'Dosya gerekli.' }, 400);
      if (dosya.size > 1800000) return json({ hata: 'Fotoğraf çok büyük.' }, 400);
      const b = new Uint8Array(await dosya.arrayBuffer());
      const bas = (...x) => x.every((v, i) => b[i] === v);
      const mime = bas(0xff, 0xd8, 0xff) ? 'image/jpeg' : bas(0x89, 0x50, 0x4e, 0x47) ? 'image/png' : bas(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 ? 'image/webp' : null;
      if (!mime) return json({ hata: 'Sadece fotoğraf yüklenebilir.' }, 400);
      await D.batch([
        D.prepare('INSERT INTO talep_foto(talep_id, mime, boyut, veri) VALUES(?,?,?,?)').bind(t.id, mime, b.length, b.buffer),
        D.prepare('UPDATE talepler SET foto_sayi = (SELECT COUNT(*) FROM talep_foto WHERE talep_id = ?1) WHERE id = ?1').bind(t.id),
      ]);
      return json({ ok: 1 });
    }
    default:
      return json({ hata: 'Bilinmeyen işlem' }, 404);
  }
}
