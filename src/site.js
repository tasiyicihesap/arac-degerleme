// OTOKABUL — müşteri sitesi API'si (eski api.php)
import { db, ayarlar, simdi, int, str, kes, dolu, buYil, gorselHaritasi, logoUrl, modelGorselUrl } from './db.js';
import { teklifHesapla, PARCALAR, DURUMLAR } from './fiyat.js';
import { json, rastgeleHex } from './yardim.js';

export async function siteApi(req, env) {
  const url = new URL(req.url);
  const q = (k) => url.searchParams.get(k) ?? '';
  const a = q('a');
  const D = await db(env);
  switch (a) {
    case 'firma': {
      const A = await ayarlar(D);
      return json({ ad: A.firma_adi, alt: A.firma_alt, telefon: A.telefon, whatsapp: A.whatsapp, adres: A.adres, teklif_goster: A.teklif_goster === '1' });
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
      const s = await teklifHesapla(D, g, A);
      const anahtar = rastgeleHex(12);
      const r = await D.prepare(`INSERT INTO talepler(tarih, ad, tel, il, marka, model, yil, versiyon, yakit, vites, kasa, km, renk, hasar, tramer, agir, baz, teklif_min, teklif_max, detay, ip, anahtar)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(simdi(), ad, tel, kes(g.il, 40), str(g.marka), str(g.model), int(g.yil),
        kes(g.versiyon, 80), str(g.yakit), str(g.vites), str(g.kasa), int(g.km), kes(g.renk, 30), Object.keys(hasar).length ? JSON.stringify(hasar) : '[]',
        int(g.tramer), dolu(g.agir) ? 1 : 0, s.baz, s.min, s.max, JSON.stringify(s), ip, anahtar).run();
      const no = int(r.meta.last_row_id);
      if (A.teklif_goster !== '1' && s.durum === 'ok') { s.durum = 'gizli'; s.min = s.max = 0; s.mesaj = 'Talebiniz alındı. Uzmanımız teklifimizle birlikte kısa süre içinde sizi arayacak.'; }
      return json({ no, anahtar, durum: s.durum, min: s.min, max: s.max, mesaj: s.mesaj });
    }
    case 'randevu': {
      if (req.method !== 'POST') return json({ hata: 'POST gerekli' }, 405);
      let g = {}; try { g = (await req.json()) || {}; } catch (e) {}
      const t = await D.prepare('SELECT id, kabul_tarih FROM talepler WHERE id = ? AND anahtar = ?').bind(int(g.no), str(g.anahtar ?? '-') || '-').first();
      if (!t) return json({ hata: 'Talep bulunamadı. Lütfen bizi telefonla arayın.' }, 404);
      if (!t.kabul_tarih) await D.prepare("UPDATE talepler SET durum = 'Randevu İstedi', kabul_tarih = ? WHERE id = ?").bind(simdi(), t.id).run();
      return json({ ok: 1 });
    }
    default:
      return json({ hata: 'Bilinmeyen işlem' }, 404);
  }
}
