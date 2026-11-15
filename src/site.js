// OTOKABUL — müşteri sitesi API'si (eski api.php)
import { db, ayarlar, simdi, int, str, kes, dolu, buYil, gorselHaritasi, logoUrl, modelGorselUrl, donanimlar } from './db.js';
import { teklifHesapla, PARCALAR, DURUMLAR } from './fiyat.js';
import { json, rastgeleHex } from './yardim.js';
import { epostaGonder, whatsappGonder } from './bildirim.js';

export async function siteApi(req, env, ctx) {
  const arkada = (p) => (ctx && ctx.waitUntil ? ctx.waitUntil(p.catch((e) => console.error(e))) : p);
  const url = new URL(req.url);
  const q = (k) => url.searchParams.get(k) ?? '';
  const a = q('a');
  const D = await db(env);
  switch (a) {
    case 'firma': {
      const A = await ayarlar(D);
      return json({ ad: A.firma_adi, alt: A.firma_alt, telefon: A.telefon, whatsapp: A.whatsapp, eposta: A.eposta, adres: A.adres, teklif_goster: A.teklif_goster === '1',
        donanimlar: donanimlar(A).map((d) => ({ ad: d.ad, kosul: d.kosul })) });
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
      return json(results.map((x) => ({ ad: x.model, n: int(x.adet), gorsel: modelGorselUrl(h, marka, x.model), kasa: x.kasa || '' })));
    }
    case 'secenekler': {
      const yol = `$."${int(q('yil'))}"`;
      const { results } = await D.prepare(`SELECT id, versiyon, kasa, yakit, vites, motor, beygir FROM katalog
        WHERE aktif = 1 AND marka = ? AND model = ? AND json_extract(degerler, ?) IS NOT NULL ORDER BY versiyon COLLATE NOCASE`).bind(q('marka'), q('model'), yol).all();
      return json(results.map((x) => ({ id: int(x.id), ad: x.versiyon, kasa: x.kasa || 'Diğer', yakit: x.yakit, vites: x.vites, motor: x.motor, beygir: int(x.beygir) })));
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
    case 'teklif': {
      if (req.method !== 'POST') return json({ hata: 'POST gerekli' }, 405);
      let g = {}; try { g = (await req.json()) || {}; } catch (e) {}
      if (typeof g !== 'object' || Array.isArray(g)) g = {};
      const ad = kes(str(g.ad).trim(), 80).trim();
      const tel = str(g.tel).replace(/[^\d+]/g, '');
      if (ad === '' || tel.replace(/\D/g, '').length < 10) return json({ hata: 'Ad ve geçerli bir telefon numarası gerekli.' }, 400);
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
      const r = await D.prepare(`INSERT INTO talepler(tarih, ad, tel, il, marka, model, yil, versiyon, yakit, vites, kasa, km, renk, hasar, tramer, agir, baz, teklif_min, teklif_max, detay, ip, anahtar, donanim, aciklama)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(simdi(), ad, tel, kes(g.il, 40), str(g.marka), str(g.model), int(g.yil),
        kes(g.versiyon, 80), str(g.yakit), str(g.vites), str(g.kasa), int(g.km), kes(g.renk, 30), Object.keys(hasar).length ? JSON.stringify(hasar) : '[]',
        int(g.tramer), dolu(g.agir) ? 1 : 0, s.baz, s.min, s.max, JSON.stringify(s), ip, anahtar, g.donanim.length ? JSON.stringify(g.donanim) : '', kes(str(g.aciklama).trim(), 1500)).run();
      const no = int(r.meta.last_row_id);
      if (A.bildirim_talep === '1') {
        const tf = (n) => new Intl.NumberFormat('tr-TR').format(n);
        const hs = Object.keys(hasar).length;
        const ozet = `Yeni teklif talebi #${no}\n${ad} — ${tel}\n${str(g.marka)} ${str(g.model)} ${int(g.yil)} ${kes(g.versiyon, 80)}\n${tf(int(g.km))} km · ${hs ? hs + ' parça boya/değişen' : 'hatasız'}${int(g.tramer) ? ' · tramer ' + tf(int(g.tramer)) + ' TL' : ''}\nTeklif: ${s.min ? tf(s.min) + ' – ' + tf(s.max) + ' TL' : 'otomatik teklif yok'}`;
        arkada(Promise.all([
          epostaGonder(env, A, { konu: `Yeni teklif talebi #${no}: ${str(g.marka)} ${str(g.model)} ${int(g.yil)}`, metin: ozet + '\n\nDetaylar yönetim panelinde, Teklif Talepleri bölümünde.' }),
          whatsappGonder(A, '🚗 ' + ozet),
        ]));
      }
      if (A.teklif_goster !== '1' && s.durum === 'ok') { s.durum = 'gizli'; s.min = s.max = 0; s.mesaj = 'Talebiniz alındı. Uzmanımız teklifimizle birlikte kısa süre içinde sizi arayacak.'; }
      return json({ no, anahtar, durum: s.durum, min: s.min, max: s.max, mesaj: s.mesaj });
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
      const c = await D.prepare("SELECT COUNT(*) n FROM mesajlar WHERE kaynak = 'form' AND ip = ? AND tarih > ?").bind(ip, simdi(Date.now() - 3600 * 1000)).first();
      if (int(c.n) >= 5) return json({ hata: 'Çok fazla mesaj gönderildi, lütfen bizi telefonla ara.' }, 429);
      const r = await D.prepare("INSERT INTO mesajlar(tarih, kaynak, ad, tel, eposta, konu, mesaj, ip) VALUES(?, 'form', ?, ?, ?, 'Site iletişim formu', ?, ?)").bind(simdi(), ad, tel, eposta, mesaj, ip).run();
      const id = int(r.meta.last_row_id);
      const A = await ayarlar(D);
      const bilgi = `${ad}${tel ? '\nTelefon: ' + tel : ''}${eposta ? '\nE-posta: ' + eposta : ''}`;
      arkada((async () => {
        const [ed, wd] = await Promise.all([
          epostaGonder(env, A, { konu: 'Siteden yeni mesaj: ' + ad, metin: `Siteden yeni mesaj var.\n\n${bilgi}\n\nMesaj:\n${mesaj}\n\nBu e-postayı yanıtlarsan cevabın doğrudan müşteriye gider${eposta ? '' : ' (müşteri e-posta yazmadı, telefonla dönmen gerekiyor)'}.`, yanitla: eposta }),
          whatsappGonder(A, `✉️ Siteden yeni mesaj\n${bilgi}\n\n${kes(mesaj, 600)}`),
        ]);
        await D.prepare('UPDATE mesajlar SET eposta_durum = ?, wa_durum = ? WHERE id = ?').bind(ed, wd, id).run();
      })());
      return json({ ok: 1 });
    }
    case 'randevu': {
      if (req.method !== 'POST') return json({ hata: 'POST gerekli' }, 405);
      let g = {}; try { g = (await req.json()) || {}; } catch (e) {}
      const t = await D.prepare('SELECT id, kabul_tarih FROM talepler WHERE id = ? AND anahtar = ?').bind(int(g.no), str(g.anahtar ?? '-') || '-').first();
      if (!t) return json({ hata: 'Talep bulunamadı. Lütfen bizi telefonla arayın.' }, 404);
      if (!t.kabul_tarih) await D.prepare("UPDATE talepler SET durum = 'Randevu İstedi', kabul_tarih = ? WHERE id = ?").bind(simdi(), t.id).run();
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
