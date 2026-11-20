// OTOKABUL — yönetim paneli API'si (eski yonetim/api.php)
import { kopruCanli } from './dogrula.js';
import { driveAyar, driveGonder, driveYedekle } from './drive.js';
import {
  db, R, ayarlar, ayarKaydet, gizliAyar, simdi, bugun, buYil, buAy, int, flt, str, kes, yuvar, nf, VARSAYILAN_AYARLAR,
  piyasaYaz, katalogTemizle, katalogParcaYaz, kaskoFiyatlariniGuncelle, MODEL_EKLE, gorselSlug, gorselHaritasi, logoUrl, modelGorselUrl,
} from './db.js';
import { teklifHesapla, bazFiyat } from './fiyat.js';
import { istatistikOzet } from './istatistik.js';
import { kopruAnahtari } from './kopru.js';
import { araclariTemizle, MARKA_IZIN_VARSAYILAN } from './temizlik.js';
import { durumDegisti, talepMesajlari, denemePlanla, mesajOzet, telN } from './musteri.js';
import { epostaGonder, anlikBildir, telegramGonder } from './bildirim.js';
import { json, rastgeleHex, sifreOzet, sifreDogrula, CEREZ, oturumYaz, oturumOku, cerezAl, cerezBaslik } from './yardim.js';

const OTURUM_SURE = 12 * 3600 * 1000;

// Filtreye göre WHERE oluşturur (fiyat tablosu ve toplu işlem ortak)
function filtreSql(f, p) {
  f = f && typeof f === 'object' ? f : {};
  const w = ['1=1'];
  if (Array.isArray(f.markalar) && f.markalar.length) { w.push('marka IN (' + f.markalar.map(() => '?').join(',') + ')'); p.push(...f.markalar.map(str)); }
  if (str(f.model) !== '') { w.push('model LIKE ?'); p.push('%' + str(f.model) + '%'); }
  if (str(f.ara) !== '') { w.push("(marka || ' ' || model || ' ' || yil) LIKE ?"); p.push('%' + str(f.ara) + '%'); }
  if (int(f.yil1)) { w.push('yil >= ?'); p.push(int(f.yil1)); }
  if (int(f.yil2)) { w.push('yil <= ?'); p.push(int(f.yil2)); }
  const bazSql = `COALESCE(elle, CAST(${R('piyasa * (1 + ayar / 100.0)')} AS INTEGER))`;
  if (int(f.fiyat1)) { w.push(`${bazSql} >= ?`); p.push(int(f.fiyat1)); }
  if (int(f.fiyat2)) { w.push(`${bazSql} <= ?`); p.push(int(f.fiyat2)); }
  const d = str(f.durum);
  if (d === 'elle') w.push('elle IS NOT NULL');
  if (d === 'kilit') w.push('kilit = 1');
  if (d === 'pasif') w.push('aktif = 0');
  if (d === 'ayarli') w.push('ayar <> 0');
  if (d === 'az') w.push("adet < 5 AND kaynak <> 'kasko'");
  if (d === 'kasko') w.push("kaynak = 'kasko'");
  if (d === 'ilan') w.push("kaynak <> 'kasko'");
  return w.join(' AND ');
}

// SQL'deki baz fiyat (PHP bazFiyat ile aynı: elle doluysa o, değilse piyasa × (1 + ayar%))
const BAZ = (elle, ayar) => `CASE WHEN ${elle} THEN ${elle} ELSE CAST(${R(`piyasa * (1 + ${ayar} / 100.0)`)} AS INTEGER) END`;

const sayi = (x) => { const n = Number(x); return Number.isFinite(n) ? String(n) : '0'; };

export async function yonetimApi(req, env) {
  const url = new URL(req.url);
  const a = url.searchParams.get('a') ?? '';
  const D = await db(env);
  let govdeMetni = null;
  const metin = async () => (govdeMetni ??= req.method === 'POST' && !(req.headers.get('Content-Type') || '').includes('multipart') ? await req.text() : '');
  const girdi = async () => { try { const j = JSON.parse((await metin()) || 'null'); return j && typeof j === 'object' && !Array.isArray(j) ? j : {}; } catch (e) { return {}; } };

  // --- oturum ---
  let gizli = await gizliAyar(D, '_gizli');
  if (!gizli) { gizli = rastgeleHex(32); await D.prepare("INSERT OR IGNORE INTO ayarlar(k, v) VALUES('_gizli', ?)").bind(gizli).run(); gizli = await gizliAyar(D, '_gizli'); }
  const sifre = (await gizliAyar(D, 'sifre')) || '';
  const parmak = sifre.slice(-12);
  let oturum = await oturumOku(gizli, cerezAl(req, CEREZ));
  if (oturum && oturum.s !== parmak) oturum = null;
  const girisYap = async () => {
    const csrf = rastgeleHex(16);
    const c = await oturumYaz(gizli, { e: Date.now() + OTURUM_SURE, c: csrf, s: (await gizliAyar(D, 'sifre') || '').slice(-12) });
    return json({ ok: 1, csrf }, 200, { 'Set-Cookie': cerezBaslik(CEREZ, c) });
  };

  if (a === 'durum') return json({ giris: !!oturum, kurulum: sifre === '', csrf: oturum ? oturum.c : null });
  if (a === 'kurulum') {
    if (sifre !== '') return json({ hata: 'Şifre zaten belirlenmiş.' }, 403);
    const s = str((await girdi()).sifre);
    if (Array.from(s).length < 6) return json({ hata: 'Şifre en az 6 karakter olmalı.' }, 400);
    const r = await D.prepare("INSERT INTO ayarlar(k, v) VALUES('sifre', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v WHERE ayarlar.v = ''").bind(await sifreOzet(s)).run();
    if (!r.meta.changes) return json({ hata: 'Şifre zaten belirlenmiş.' }, 403);
    return girisYap();
  }
  if (a === 'giris') {
    const g = await girdi();
    const dn = JSON.parse((await gizliAyar(D, '_deneme')) || '{"n":0,"t":0}');
    if (Date.now() - dn.t > 15 * 60 * 1000) { dn.n = 0; }
    dn.n++; dn.t = Date.now();
    if (dn.n > 10) await new Promise((r) => setTimeout(r, 2000));
    if (!(await sifreDogrula(str(g.sifre), sifre))) {
      await D.prepare("INSERT INTO ayarlar(k, v) VALUES('_deneme', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(JSON.stringify(dn)).run();
      return json({ hata: 'Şifre hatalı.' }, 401);
    }
    await D.prepare("DELETE FROM ayarlar WHERE k = '_deneme'").run();
    return girisYap();
  }
  if (!oturum) return json({ hata: 'Oturum kapalı', giris: false }, 401);
  if (req.method === 'POST' && (req.headers.get('X-CSRF') || '') !== oturum.c) return json({ hata: 'Güvenlik anahtarı geçersiz, sayfayı yenileyin.' }, 403);

  switch (a) {
    case 'cikis': return json({ ok: 1 }, 200, { 'Set-Cookie': cerezBaslik(CEREZ, '', true) });

    case 'ozet': {
      const b = bugun();
      const r = await D.batch([
        D.prepare("SELECT COUNT(*) n, COUNT(DISTINCT marka) m, COUNT(DISTINCT marka || '|' || model) mm FROM fiyatlar"),
        D.prepare('SELECT COUNT(*) n FROM talepler WHERE tarih >= ?').bind(b),
        D.prepare("SELECT COUNT(*) n FROM talepler WHERE durum = 'Yeni'"),
        D.prepare("SELECT COUNT(*) n FROM talepler WHERE durum = 'Randevu İstedi'"),
        D.prepare('SELECT COUNT(*) n FROM talepler'),
        D.prepare('SELECT * FROM robot_log ORDER BY id DESC LIMIT 1'),
        D.prepare('SELECT id, tarih, ad, tel, marka, model, yil, km, teklif_min, teklif_max, durum FROM talepler ORDER BY id DESC LIMIT 8'),
        D.prepare('SELECT id, tarih, aciklama, etkilenen, geri_alindi FROM islemler ORDER BY id DESC LIMIT 5'),
        D.prepare('SELECT COUNT(*) n FROM mesajlar WHERE okundu = 0'),
      ]);
      const n = (i) => int(r[i].results[0].n);
      return json({ satir: n(0), marka: int(r[0].results[0].m), model: int(r[0].results[0].mm), talep_bugun: n(1), talep_yeni: n(2), talep_randevu: n(3), talep_toplam: n(4),
        robot: r[5].results[0] || null, son_talepler: r[6].results, islem: r[7].results, mesaj_yeni: n(8) });
    }
    case 'rozet': { // menüdeki sayaçlar (panel açıkken dakikada bir) — hafif sorgu
      const r = await D.prepare("SELECT (SELECT COUNT(*) FROM talepler WHERE durum = 'Yeni') y, (SELECT COUNT(*) FROM talepler WHERE durum = 'Randevu İstedi') r, (SELECT COUNT(*) FROM mesajlar WHERE okundu = 0) m").first();
      return json({ talep_yeni: int(r.y), talep_randevu: int(r.r), mesaj_yeni: int(r.m) });
    }

    // --- fiyat tablosu ---
    case 'markalar': {
      const { results } = await D.prepare('SELECT DISTINCT marka FROM fiyatlar ORDER BY marka COLLATE NOCASE').all();
      return json(results.map((x) => x.marka));
    }
    case 'fiyatlar': {
      const f = await girdi(); const p = [];
      const w = filtreSql(f, p);
      const siralar = { marka: 'marka COLLATE NOCASE, model COLLATE NOCASE, yil DESC', yil: 'yil DESC, marka, model', piyasa: 'piyasa DESC', adet: 'adet DESC', degisim: 'CASE WHEN onceki > 0 THEN ABS(piyasa * 1.0 / onceki - 1) ELSE 0 END DESC' };
      const sira = siralar[str(f.sira) || 'marka'] || siralar.marka;
      const lim = Math.min(2000, Math.max(50, int(f.limit ?? 500) || 50));
      const [t, s] = await D.batch([D.prepare(`SELECT COUNT(*) n FROM fiyatlar WHERE ${w}`).bind(...p), D.prepare(`SELECT * FROM fiyatlar WHERE ${w} ORDER BY ${sira} LIMIT ${lim}`).bind(...p)]);
      const A = await ayarlar(D); const m = flt(A.alim_marji);
      const rows = s.results;
      for (const r of rows) { r.baz = bazFiyat(r); r.teklif = yuvar(r.baz * (1 - m / 100)); }
      return json({ toplam: int(t.results[0].n), satirlar: rows, marj: m });
    }
    case 'satir_kaydet': {
      const g = await girdi(); const id = int(g.id);
      const eski = await D.prepare('SELECT * FROM fiyatlar WHERE id = ?').bind(id).first();
      if (!eski) return json({ hata: 'Satır bulunamadı' }, 404);
      const alan = str(g.alan); let deger = g.deger ?? null;
      const izin = { ayar: 'float', elle: 'int?', kilit: 'bool', aktif: 'bool', piyasa: 'int' };
      if (!izin[alan]) return json({ hata: 'Alan değiştirilemez' }, 400);
      if (izin[alan] === 'float') deger = yuvar(flt(str(deger).replace(',', '.')), 2);
      else if (izin[alan] === 'int?') deger = deger === '' || deger === null || int(deger) <= 0 ? null : int(deger);
      else if (izin[alan] === 'bool') deger = deger && deger !== '0' ? 1 : 0;
      else deger = Math.max(0, int(deger));
      const t = simdi();
      await D.batch([
        D.prepare(`UPDATE fiyatlar SET ${alan} = ?, guncelleme = ? WHERE id = ?`).bind(deger, t, id),
        D.prepare('INSERT INTO islemler(tarih, aciklama, etkilenen, yedek) VALUES(?,?,?,?)').bind(t, `Tek satır: ${eski.marka} ${eski.model} ${eski.yil} — ${alan}`, 1,
          JSON.stringify([{ id, ayar: eski.ayar, elle: eski.elle, kilit: eski.kilit, aktif: eski.aktif, piyasa: eski.piyasa }])),
      ]);
      const r = await D.prepare('SELECT * FROM fiyatlar WHERE id = ?').bind(id).first();
      const A = await ayarlar(D);
      r.baz = bazFiyat(r); r.teklif = yuvar(r.baz * (1 - flt(A.alim_marji) / 100));
      return json({ ok: 1, satir: r });
    }
    case 'satir_ekle': {
      const g = await girdi();
      const marka = str(g.marka).trim(), model = str(g.model).trim(), yil = int(g.yil), fiyat = int(g.fiyat);
      if (!marka || !model || yil < 1950 || fiyat <= 0) return json({ hata: 'Marka, model, yıl ve fiyat gerekli.' }, 400);
      await D.prepare("INSERT INTO fiyatlar(marka, model, yil, piyasa, elle, kilit, kaynak, guncelleme) VALUES(?,?,?,?,?,1,'elle',?) ON CONFLICT(marka, model, yil) DO UPDATE SET elle = excluded.elle, kilit = 1, guncelleme = excluded.guncelleme")
        .bind(marka, model, yil, fiyat, fiyat, simdi()).run();
      return json({ ok: 1 });
    }

    // --- toplu fiyat değişimi ---
    case 'toplu_onizle':
    case 'toplu_uygula': {
      const g = await girdi(); const p = [];
      let w = filtreSql(g.filtre, p);
      const oran = yuvar(flt(str(g.oran ?? 0).replace(',', '.')), 3);
      const tip = str(g.tip) || 'yuzde';
      const hedef = str(g.hedef) || 'hepsi';
      if (hedef === 'robot') w += ' AND elle IS NULL';
      if (hedef === 'elle') w += ' AND elle IS NOT NULL';
      if (tip !== 'sifirla' && oran === 0) return json({ hata: 'Değişim oranı/tutarı girin.' }, 400);
      if (tip === 'yuzde' && oran <= -90) return json({ hata: 'Oran çok düşük.' }, 400);
      const o = sayi(oran);
      let yElle, yAyar;
      if (tip === 'sifirla') { yElle = 'NULL'; yAyar = '0'; }
      else if (tip === 'yuzde') {
        yElle = `CASE WHEN elle THEN CAST(${R(`elle * (1 + ${o} / 100.0)`)} AS INTEGER) ELSE elle END`;
        yAyar = `CASE WHEN elle THEN ayar ELSE ${R(`((1 + ayar / 100.0) * (1 + ${o} / 100.0) - 1) * 100`, 3)} END`;
      } else {
        yElle = `CASE WHEN elle THEN MAX(1000, elle + ${sayi(Math.trunc(oran))}) ELSE elle END`;
        yAyar = `CASE WHEN elle THEN ayar WHEN piyasa > 0 THEN ${R(`((${BAZ('elle', 'ayar')} + ${o}) * 1.0 / piyasa - 1) * 100`, 3)} ELSE ayar END`;
      }
      const eskiB = BAZ('elle', 'ayar');
      const yeniB = `CASE WHEN (${yElle}) THEN (${yElle}) ELSE CAST(${R(`piyasa * (1 + (${yAyar}) / 100.0)`)} AS INTEGER) END`;
      if (a === 'toplu_onizle') {
        const [t, s] = await D.batch([
          D.prepare(`SELECT COUNT(*) n, SUM(${eskiB}) te, SUM(${yeniB}) ty FROM fiyatlar WHERE ${w}`).bind(...p),
          D.prepare(`SELECT marka, model, yil, ${eskiB} eski, ${yeniB} yeni FROM fiyatlar WHERE ${w} ORDER BY marka, model, yil DESC LIMIT 30`).bind(...p),
        ]);
        const x = t.results[0]; const te = flt(x.te), ty = flt(x.ty);
        return json({ adet: int(x.n), ornek: s.results, ort_degisim: te ? yuvar((ty / te - 1) * 100, 2) : 0 });
      }
      const c = await D.prepare(`SELECT COUNT(*) n FROM fiyatlar WHERE ${w}`).bind(...p).first();
      if (!int(c.n)) return json({ hata: 'Filtreye uyan satır yok.' }, 400);
      let acik = str(g.aciklama).trim();
      if (acik === '') acik = tip === 'sifirla' ? 'Ayarları sıfırla' : tip === 'yuzde' ? (oran > 0 ? '+' : '') + oran + '% toplu değişim' : (oran > 0 ? '+' : '') + nf(oran) + ' TL toplu değişim';
      const t = simdi();
      const r = await D.batch([
        D.prepare(`INSERT INTO islemler(tarih, aciklama, etkilenen, yedek) SELECT ?, ?, COUNT(*), json_group_array(json_object('id', id, 'ayar', ayar, 'elle', elle))
          FROM (SELECT id, ayar, elle FROM fiyatlar WHERE ${w} ORDER BY marka, model, yil DESC)`).bind(t, acik, ...p),
        D.prepare(`UPDATE fiyatlar SET elle = ${yElle}, ayar = ${yAyar}, guncelleme = ? WHERE ${w}`).bind(t, ...p),
      ]);
      return json({ ok: 1, adet: int(r[1].meta.changes) });
    }
    case 'islemler': {
      const { results } = await D.prepare('SELECT id, tarih, aciklama, etkilenen, geri_alindi FROM islemler ORDER BY id DESC LIMIT 100').all();
      return json(results);
    }
    case 'geri_al': {
      const g = await girdi(); const id = int(g.id);
      const i = await D.prepare('SELECT id, geri_alindi FROM islemler WHERE id = ?').bind(id).first();
      if (!i || i.geri_alindi) return json({ hata: 'İşlem bulunamadı veya zaten geri alındı.' }, 400);
      const alan = (k) => `${k} = CASE WHEN json_type(y.value, '$.${k}') IS NOT NULL THEN json_extract(y.value, '$.${k}') ELSE fiyatlar.${k} END`;
      await D.batch([
        D.prepare(`UPDATE fiyatlar SET ${['ayar', 'elle', 'kilit', 'aktif', 'piyasa'].map(alan).join(', ')}
          FROM (SELECT j.value FROM islemler, json_each(islemler.yedek) j WHERE islemler.id = ?1) y WHERE fiyatlar.id = json_extract(y.value, '$.id')`).bind(id),
        D.prepare('UPDATE islemler SET geri_alindi = 1 WHERE id = ?').bind(id),
      ]);
      return json({ ok: 1 });
    }

    // --- robot ---
    case 'robot_kaydet': {
      const ham = await metin();
      const g = await girdi();
      if (!Array.isArray(g.satirlar) || !g.satirlar.length) return json({ hata: 'Kaydedilecek piyasa verisi yok.' }, 400);
      // D1 tek parametre sınırı ~2 MB: büyük gövdeyi parçalara böl
      let s;
      if (ham.length < 1800000) s = await piyasaYaz(D, ham);
      else {
        const ver = g.versiyonlar && typeof g.versiyonlar === 'object' ? g.versiyonlar : {};
        const parca = 8000; const top = { yeni: 0, guncellenen: 0, kilitli: 0, genel_degisim: 0, marka: {} };
        for (let i = 0; i < g.satirlar.length; i += parca) {
          const x = await piyasaYaz(D, JSON.stringify({ satirlar: g.satirlar.slice(i, i + parca), versiyonlar: i === 0 ? ver : {} }));
          top.yeni += x.yeni; top.guncellenen += x.guncellenen; top.kilitli += x.kilitli;
          if (i === 0) { top.genel_degisim = x.genel_degisim; top.marka = x.marka; }
        }
        s = top;
      }
      await D.prepare('INSERT INTO robot_log(tarih, kaynak, kayit, cozulen, satir, yeni, degisim, ozet) VALUES(?,?,?,?,?,?,?,?)')
        .bind(simdi(), kes(g.kaynak ?? 'AraçRadar', 200), int(g.toplamKayit), int(g.cozulen), g.satirlar.length, s.yeni, s.genel_degisim, JSON.stringify(s.marka)).run();
      return json({ ok: 1, ...s });
    }
    case 'piyasa_tumu': {
      // tek seferde büyük JSON yerine 10.000'lik parçalar halinde, doğrudan SQL'de üretilir
      const parcalar = [];
      for (let o = 0; ; o += 10000) {
        const r = await D.prepare(`SELECT json_group_object(marka || '|' || model || '|' || yil, json_array(piyasa, kilit, CASE WHEN elle THEN 1 ELSE 0 END)) j, COUNT(*) n
          FROM (SELECT marka, model, yil, piyasa, kilit, elle FROM fiyatlar ORDER BY id LIMIT 10000 OFFSET ?)`).bind(o).first();
        if (!r || !int(r.n)) break;
        const ic = r.j.slice(1, -1); if (ic) parcalar.push(ic);
        if (int(r.n) < 10000) break;
      }
      return json('{' + parcalar.join(',') + '}');
    }

    // --- TSB katalog ---
    case 'katalog_durum': {
      const r = await D.batch([
        D.prepare('SELECT COUNT(*) n FROM katalog'),
        D.prepare("SELECT COUNT(DISTINCT marka || '|' || model) n FROM katalog"),
        D.prepare('SELECT COUNT(DISTINCT marka) n FROM katalog'),
        D.prepare('SELECT COUNT(*) n FROM katalog k, json_each(k.degerler) d'),
        D.prepare('SELECT MIN(CAST(d.key AS INTEGER)) a, MAX(CAST(d.key AS INTEGER)) b FROM katalog k, json_each(k.degerler) d'),
        D.prepare("SELECT COUNT(*) n FROM fiyatlar WHERE kaynak = 'kasko'"),
        D.prepare("SELECT COUNT(*) n FROM fiyatlar WHERE kaynak <> 'kasko'"),
        D.prepare("SELECT * FROM kalibrasyon ORDER BY CASE WHEN marka = '*' THEN 0 ELSE 1 END, ornek DESC"),
        D.prepare('SELECT * FROM model_eslestirme ORDER BY marka, tsb'),
        D.prepare("SELECT f.marka, f.model, SUM(f.adet) n FROM fiyatlar f WHERE f.kaynak = 'robot' AND NOT EXISTS (SELECT 1 FROM katalog k WHERE k.marka = f.marka AND k.model = f.model) GROUP BY f.marka, f.model ORDER BY n DESC LIMIT 200"),
        D.prepare("SELECT k.marka, k.model, COUNT(*) n FROM katalog k WHERE NOT EXISTS (SELECT 1 FROM fiyatlar f WHERE f.marka = k.marka AND f.model = k.model AND f.kaynak = 'robot') GROUP BY k.marka, k.model ORDER BY k.marka, k.model LIMIT 400"),
      ]);
      const A = await ayarlar(D); const n = (i) => int(r[i].results[0].n);
      return json({ versiyon: n(0), model: n(1), marka: n(2), deger: n(3), yillar: r[4].results[0], kaynak: A.kasko_kaynak,
        kasko_satir: n(5), ilan_satir: n(6), kalibrasyon: r[7].results, eslestirme: r[8].results, sadece_ilan: r[9].results, sadece_kasko: r[10].results });
    }
    case 'site_modelleri': {
      const [m, e] = await D.batch([D.prepare("SELECT DISTINCT marka, model FROM fiyatlar WHERE kaynak <> 'kasko'"), D.prepare('SELECT marka, tsb, model FROM model_eslestirme')]);
      return json({ modeller: m.results, eslestirme: e.results });
    }
    case 'katalog_basla': await katalogTemizle(D); return json({ ok: 1 });
    case 'katalog_parca': {
      const ham = await metin(); let adet = 0;
      if (ham.length < 1800000) adet = await katalogParcaYaz(D, ham);
      else { const l = (await girdi()).liste || []; for (let i = 0; i < l.length; i += 400) adet += await katalogParcaYaz(D, JSON.stringify({ liste: l.slice(i, i + 400) })); }
      return json({ ok: 1, adet });
    }
    case 'katalog_bitir': {
      const g = await girdi(); const d = simdi();
      await ayarKaydet(D, { kasko_kaynak: kes(g.kaynak ?? 'TSB', 120) + ' · ' + d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) + ' ' + d.slice(11, 16) });
      const s = await kaskoFiyatlariniGuncelle(D);
      await D.prepare(`UPDATE fiyatlar SET aktif = 0 WHERE kaynak = 'kasko' AND kilit = 0 AND aktif = 1 AND NOT EXISTS
        (SELECT 1 FROM katalog k WHERE k.marka = fiyatlar.marka AND k.model = fiyatlar.model AND json_extract(k.degerler, '$."' || fiyatlar.yil || '"') IS NOT NULL)`).run();
      const tz = await araclariTemizle(D, (await ayarlar(D)).marka_izin).catch(() => null);
      return json({ ok: 1, ...s, temizlik: tz });
    }
    case 'arac_temizle': { const g = await girdi(); const A = await ayarlar(D); return json({ ok: 1, ...(await araclariTemizle(D, A.marka_izin, !!g.deneme)) }); }
    case 'marka_izin_varsayilan': return json({ liste: MARKA_IZIN_VARSAYILAN });
    case 'kalibre_et': return json({ ok: 1, ...(await kaskoFiyatlariniGuncelle(D)) });
    case 'katalog_liste': {
      const g = await girdi(); const w = ['1=1']; const p = [];
      if (str(g.marka) !== '') { w.push('marka = ?'); p.push(str(g.marka)); }
      if (str(g.ara) !== '') { w.push("(model || ' ' || versiyon || ' ' || tip) LIKE ?"); p.push('%' + str(g.ara) + '%'); }
      const { results } = await D.prepare(`SELECT k.id, k.marka, k.model, k.versiyon, k.tip, k.kod, k.kasa, k.yakit, k.vites, k.motor, k.beygir, k.aktif,
          (SELECT group_concat(d.key || ':' || d.value) FROM json_each(k.degerler) d) degerler FROM katalog k WHERE ${w.join(' AND ')} ORDER BY marka, model, versiyon LIMIT 600`).bind(...p).all();
      return json(results);
    }
    case 'katalog_satir': { // tek versiyonun model/kasa/yakıt/vites düzeltmesi
      const g = await girdi(); const izin = ['model', 'kasa', 'yakit', 'vites', 'motor', 'beygir', 'aktif'];
      const alan = str(g.alan); if (!izin.includes(alan)) return json({ hata: 'Alan değiştirilemez' }, 400);
      const deger = ['beygir', 'aktif'].includes(alan) ? int(g.deger) : str(g.deger).trim();
      const v = await D.prepare("SELECT m.marka, m.model, e.key i, e.value o FROM katalog_model m, json_each(m.v) e WHERE json_extract(e.value, '$.id') = ?").bind(int(g.id)).first();
      if (!v) return json({ ok: 1 });
      if (alan !== 'model') {
        await D.prepare("UPDATE katalog_model SET v = json_set(v, '$[' || CAST(?3 AS INTEGER) || '].' || ?4, ?5) WHERE marka = ?1 AND model = ?2").bind(v.marka, v.model, v.i, alan, deger).run();
      } else if (deger !== v.model) { // versiyonu başka modele taşı
        await D.batch([
          D.prepare("UPDATE katalog_model SET v = json_remove(v, '$[' || CAST(?3 AS INTEGER) || ']') WHERE marka = ?1 AND model = ?2").bind(v.marka, v.model, v.i),
          D.prepare(`INSERT INTO katalog_model(marka, model, v) SELECT ?1, ?2, json_array(json(?3)) WHERE 1 ${MODEL_EKLE}`).bind(v.marka, deger, v.o),
          D.prepare("DELETE FROM katalog_model WHERE marka = ? AND json_array_length(v) = 0").bind(v.marka),
        ]);
      }
      return json({ ok: 1 });
    }
    case 'eslestirme_ekle': {
      const g = await girdi(); const m = str(g.marka).trim(), t = str(g.tsb).trim(), mo = str(g.model).trim();
      if (!m || !t || !mo) return json({ hata: 'Marka, TSB başlangıcı ve site modeli gerekli.' }, 400);
      const T = t.toUpperCase();
      // TSB tip adı bu başlangıçla eşleşen versiyonlar seçilen modele taşınır
      const es = "(json_extract(e.value, '$.tip') = ?2 OR json_extract(e.value, '$.tip') LIKE ?3)";
      const c = await D.prepare('SELECT COUNT(*) n FROM katalog WHERE marka = ? AND (tip = ? OR tip LIKE ?)').bind(m, T, T + ' %').first();
      await D.batch([
        D.prepare('INSERT INTO model_eslestirme(marka, tsb, model) VALUES(?,?,?)').bind(m, t, mo),
        D.prepare(`INSERT INTO katalog_model(marka, model, v) SELECT ma, mo, l FROM (SELECT ?1 ma, ?4 mo, json_group_array(json(e.value)) l, COUNT(*) n
            FROM katalog_model k, json_each(k.v) e WHERE k.marka = ?1 AND k.model <> ?4 AND ${es}) WHERE n > 0 ${MODEL_EKLE}`).bind(m, T, T + ' %', mo),
        D.prepare(`UPDATE katalog_model SET v = (SELECT json_group_array(json(e.value)) FROM json_each(katalog_model.v) e WHERE NOT ${es})
          WHERE marka = ?1 AND model <> ?4 AND EXISTS (SELECT 1 FROM json_each(katalog_model.v) e WHERE ${es})`).bind(m, T, T + ' %', mo),
        D.prepare('DELETE FROM katalog_model WHERE marka = ? AND json_array_length(v) = 0').bind(m),
      ]);
      await kaskoFiyatlariniGuncelle(D);
      return json({ ok: 1, guncellenen: int(c && c.n) });
    }
    case 'eslestirme_sil': { const g = await girdi(); await D.prepare('DELETE FROM model_eslestirme WHERE id = ?').bind(int(g.id)).run(); return json({ ok: 1 }); }

    case 'tsb_indir': return tsbIndir();

    // --- görseller ---
    case 'gorsel_yukle': {
      let fd; try { fd = await req.formData(); } catch (e) { return json({ hata: 'Dosya ve marka/model gerekli.' }, 400); }
      const tur = ['logo', 'site'].includes(fd.get('tur')) ? fd.get('tur') : 'model';
      const ad = tur !== 'model' ? gorselSlug(fd.get('marka')) : gorselSlug(fd.get('marka')) + '--' + gorselSlug(fd.get('model'));
      const dosya = fd.get('dosya');
      if (ad === '' || ad === '--' || !dosya || typeof dosya === 'string' || !dosya.size) return json({ hata: 'Dosya ve marka/model gerekli.' }, 400);
      if (dosya.size > 3 * 1024 * 1024) return json({ hata: 'Dosya en fazla 3 MB olabilir.' }, 400);
      const b = new Uint8Array(await dosya.arrayBuffer());
      const bas = (...x) => x.every((v, i) => b[i] === v);
      const uz = bas(0x89, 0x50, 0x4e, 0x47) ? 'png' : bas(0xff, 0xd8, 0xff) ? 'jpg' : bas(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 ? 'webp' : null;
      if (!uz) return json({ hata: 'Sadece PNG, JPG veya WEBP yükleyebilirsiniz.' }, 400);
      const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[uz];
      const P = 1500000; const st = [D.prepare('DELETE FROM gorsel_parca WHERE tur = ? AND ad = ?').bind(tur, ad)];
      let sira = 0; for (let i = 0; i < b.length; i += P) st.push(D.prepare('INSERT INTO gorsel_parca(tur, ad, sira, veri) VALUES(?,?,?,?)').bind(tur, ad, sira++, b.slice(i, i + P).buffer));
      const zaman = Math.floor(Date.now() / 1000);
      st.push(D.prepare('INSERT OR REPLACE INTO gorseller(tur, ad, uz, mime, boyut, parca, zaman) VALUES(?,?,?,?,?,?,?)').bind(tur, ad, uz, mime, b.length, sira, zaman));
      await D.batch(st);
      return json({ ok: 1, url: `yuklemeler/${tur}/${ad}.${uz}` });
    }
    case 'gorsel_sil': {
      const g = await girdi(); const tur = ['logo', 'site'].includes(g.tur) ? g.tur : 'model';
      const ad = tur !== 'model' ? gorselSlug(g.marka) : gorselSlug(g.marka) + '--' + gorselSlug(g.model);
      await D.batch([D.prepare('DELETE FROM gorseller WHERE tur = ? AND ad = ?').bind(tur, ad), D.prepare('DELETE FROM gorsel_parca WHERE tur = ? AND ad = ?').bind(tur, ad)]);
      return json({ ok: 1 });
    }
    case 'gorseller': {
      const [{ results }, h] = await Promise.all([D.prepare('SELECT DISTINCT marka FROM fiyatlar ORDER BY marka').all(), gorselHaritasi(D)]);
      return json({ logo: results.map((r) => ({ marka: r.marka, url: logoUrl(h, r.marka) })), model: [] });
    }
    case 'model_gorselleri': {
      const g = await girdi(); const m = str(g.marka);
      const [{ results }, h] = await Promise.all([D.prepare('SELECT DISTINCT model FROM fiyatlar WHERE marka = ? ORDER BY model COLLATE NOCASE').bind(m).all(), gorselHaritasi(D)]);
      return json(results.map((r) => ({ model: r.model, url: modelGorselUrl(h, m, r.model) })));
    }

    case 'robot_log': { const { results } = await D.prepare('SELECT * FROM robot_log ORDER BY id DESC LIMIT 30').all(); return json(results); }

    case 'liste_ice_aktar': {
      const g = await girdi(); const mod = g.mod === 'piyasa' ? 'piyasa' : 'elle';
      const temiz = [];
      for (const s of Array.isArray(g.satirlar) ? g.satirlar : []) {
        if (!Array.isArray(s)) continue;
        const ma = str(s[0]).trim(), mo = str(s[1]).trim(), yi = int(s[2]), fi = int(str(s[3]).replace(/\D/g, '') || 0);
        if (!ma || !mo || yi < 1950 || fi <= 0) continue;
        temiz.push([ma, mo, yi, fi]);
      }
      const t = simdi();
      for (let i = 0; i < temiz.length; i += 5000) {
        const j = JSON.stringify(temiz.slice(i, i + 5000));
        const sec = "SELECT json_extract(value,'$[0]'), json_extract(value,'$[1]'), json_extract(value,'$[2]'), json_extract(value,'$[3]')";
        await D.prepare(mod === 'elle'
          ? `INSERT INTO fiyatlar(marka, model, yil, piyasa, elle, kaynak, guncelleme) ${sec}, json_extract(value,'$[3]'), 'liste', ?2 FROM json_each(?1) WHERE 1
             ON CONFLICT(marka, model, yil) DO UPDATE SET elle = excluded.elle, guncelleme = excluded.guncelleme`
          : `INSERT INTO fiyatlar(marka, model, yil, piyasa, elle, kaynak, guncelleme) ${sec}, NULL, 'liste', ?2 FROM json_each(?1) WHERE 1
             ON CONFLICT(marka, model, yil) DO UPDATE SET onceki = piyasa, piyasa = excluded.piyasa, kaynak = 'liste', guncelleme = excluded.guncelleme`).bind(j, t).run();
      }
      return json({ ok: 1, adet: temiz.length });
    }

    // --- talepler ---
    case 'talepler': {
      const g = await girdi(); const w = ['1=1']; const p = [];
      if (str(g.durum) !== '') { w.push('durum = ?'); p.push(str(g.durum)); }
      if (str(g.ara) !== '') { w.push("(ad || ' ' || tel || ' ' || marka || ' ' || model || ' ' || il) LIKE ?"); p.push('%' + str(g.ara) + '%'); }
      const { results } = await D.prepare(`SELECT * FROM talepler WHERE ${w.join(' AND ')} ORDER BY CASE WHEN durum = 'ACİL SAT' THEN 0 WHEN durum = 'Randevu İstedi' THEN 1 ELSE 2 END, id DESC LIMIT 1000`).bind(...p).all();
      for (const r of results) delete r.anahtar;
      return json(results);
    }
    case 'talep_kaydet': {
      const g = await girdi();
      await D.prepare('UPDATE talepler SET durum = ?, notlar = ? WHERE id = ?').bind(kes(g.durum ?? 'Yeni', 30), kes(g.notlar ?? '', 2000), int(g.id)).run();
      await durumDegisti(D, int(g.id), kes(g.durum ?? 'Yeni', 30));
      return json({ ok: 1 });
    }
    case 'talep_mesajlar': { const g = await girdi(); return json(await talepMesajlari(D, int(g.id))); }
    case 'mm_ozet': return json(await mesajOzet(D));
    case 'rehber': { // müşteri telefon / e-posta yedeği
      const { results } = await D.prepare('SELECT anahtar, ad, tel, eposta, ilk, son, talep, mesaj, son_arac FROM musteri_rehber ORDER BY son DESC LIMIT 5000').all();
      return json(results);
    }
    case 'mm_deneme': {
      const g = await girdi();
      try { await denemePlanla(D, await ayarlar(D), str(g.tel), str(g.tur)); } catch (e) { return json({ hata: e.message }, 400); }
      return json({ ok: 1 });
    }
    case 'mm_ret_kaldir': { const g = await girdi(); await D.prepare('DELETE FROM tel_ret WHERE tel = ?').bind(telN(g.tel)).run(); return json({ ok: 1 }); }
    case 'mm_iptal': { const g = await girdi(); await D.prepare("UPDATE musteri_mesaj SET durum = 'iptal', sonuc = 'panelden iptal', guncel = ? WHERE id = ? AND durum = 'bekliyor'").bind(simdi(), int(g.id)).run(); return json({ ok: 1 }); }
    // --- iletişim formu ve gelen e-postalar ---
    case 'kopru_anahtar': { const g = await girdi(); return json({ anahtar: await kopruAnahtari(D, !!g.yenile) }); }
    case 'istatistik': { const g = await girdi(); return istatistikOzet(D, g.gun); }
    case 'mesajlar': {
      const { results } = await D.prepare('SELECT id, tarih, kaynak, ad, tel, eposta, konu, mesaj, okundu, eposta_durum, wa_durum FROM mesajlar ORDER BY id DESC LIMIT 500').all();
      return json(results);
    }
    case 'mesaj_okundu': {
      const g = await girdi();
      if (g.hepsi) await D.prepare('UPDATE mesajlar SET okundu = 1 WHERE okundu = 0').run();
      else await D.prepare('UPDATE mesajlar SET okundu = ? WHERE id = ?').bind(g.okundu === 0 ? 0 : 1, int(g.id)).run();
      return json({ ok: 1 });
    }
    case 'mesaj_sil': {
      const g = await girdi();
      await D.prepare('DELETE FROM mesajlar WHERE id = ?').bind(int(g.id)).run();
      return json({ ok: 1 });
    }
    case 'bildirim_dene': {
      const A = await ayarlar(D);
      const [ed, wd] = await Promise.all([
        epostaGonder(env, A, { konu: 'OTOKABUL deneme bildirimi', metin: 'Bu bir deneme e-postasıdır. Siteden gelen mesajlar ve yeni teklif talepleri bu adrese gelecek.' }),
        anlikBildir(A, '✅ OTOKABUL deneme bildirimi: telefon bildirimleri çalışıyor.'),
      ]);
      return json({ eposta: ed, whatsapp: wd });
    }
    case 'tg_bagla': { // bota /start yazan sohbeti bulur ve kaydeder
      const g = await girdi();
      const A = await ayarlar(D);
      const anahtar = str(g.token || A.tg_token).trim();
      if (!/^\d+:[\w-]{20,}$/.test(anahtar)) return json({ hata: 'Bot anahtarı hatalı görünüyor. BotFather\'ın verdiği anahtarı (ör. 123456789:AAH...) eksiksiz yapıştır.' }, 400);
      let j;
      try { j = await (await fetch('https://api.telegram.org/bot' + anahtar + '/getUpdates', { signal: AbortSignal.timeout(15000) })).json(); } catch (e) { return json({ hata: 'Telegram\'a bağlanılamadı, tekrar dene.' }, 502); }
      if (!j.ok) return json({ hata: 'Telegram anahtarı kabul etmedi: ' + str(j.description) }, 400);
      const son = (j.result || []).map((u) => u.message || u.my_chat_member || u.edited_message).filter((m) => m && m.chat).pop();
      if (!son) return json({ hata: 'Bota henüz mesaj gelmemiş. Telegram\'da botunu açıp BAŞLAT\'a (/start) bas, sonra tekrar dene.' }, 400);
      const sohbet = String(son.chat.id);
      await ayarKaydet(D, { tg_token: anahtar, tg_chat: sohbet });
      const d = await telegramGonder({ tg_token: anahtar, tg_chat: sohbet }, '✅ OTOKABUL bildirimleri bu sohbete bağlandı. Siteden mesaj, yeni teklif talebi ya da bilgi@ adresine e-posta gelince burada haber vereceğim.');
      return json({ ok: 1, ad: [son.chat.first_name, son.chat.last_name].filter(Boolean).join(' ') || son.chat.title || sohbet, durum: d });
    }
    case 'talep_sil': {
      const g = await girdi();
      const dv = await driveAyar(D);
      if (dv) { // silmeden önce fotoğrafları Drive'a al
        let y; do { y = await driveYedekle(D, dv, { talepId: int(g.id), adet: 8 }); } while (y.yedeklenen && y.kalan);
        if (y.kalan) return json({ hata: 'Fotoğraflar Drive\'a yedeklenemediği için talep silinmedi' + (y.hata ? ': ' + y.hata : '') }, 502);
      }
      await D.batch([D.prepare('DELETE FROM talep_foto WHERE talep_id = ?').bind(int(g.id)), D.prepare('DELETE FROM talepler WHERE id = ?').bind(int(g.id))]);
      return json({ ok: 1 });
    }
    case 'talep_fotolar': {
      const g = await girdi();
      const { results } = await D.prepare('SELECT id, boyut FROM talep_foto WHERE talep_id = ? ORDER BY id').bind(int(g.id)).all();
      return json(results);
    }
    case 'foto': { // panelde talep fotoğrafı
      const id = int(url.searchParams.get('id'));
      const f = await D.prepare('SELECT mime, veri FROM talep_foto WHERE id = ?').bind(id).first();
      if (!f) return json({ hata: 'Fotoğraf bulunamadı' }, 404);
      return new Response(new Uint8Array(f.veri), { headers: { 'Content-Type': f.mime, 'Cache-Control': 'private, max-age=86400' } });
    }
    case 'eski_foto_sil': { // depolama dolmasın diye: X günden eski taleplerin fotoğrafları (Drive bağlıysa yalnızca yedeklenenler)
      const g = await girdi(); const gun = Math.max(7, int(g.gun) || 90);
      const sinir = simdi(Date.now() - gun * 86400000);
      const dv = await driveAyar(D);
      const yk = dv ? ' AND drive IS NOT NULL' : '';
      const r = await D.batch([
        D.prepare('DELETE FROM talep_foto WHERE talep_id IN (SELECT id FROM talepler WHERE tarih < ?)' + yk).bind(sinir),
        D.prepare('UPDATE talepler SET foto_sayi = (SELECT COUNT(*) FROM talep_foto WHERE talep_id = talepler.id) WHERE tarih < ? AND foto_sayi > 0').bind(sinir),
      ]);
      return json({ ok: 1, silinen: int(r[0].meta.changes) });
    }
    case 'foto_durum': {
      const r = await D.prepare('SELECT COUNT(*) n, COALESCE(SUM(boyut), 0) b, COALESCE(SUM(drive IS NOT NULL), 0) y FROM talep_foto').first();
      const dv = await driveAyar(D);
      return json({ adet: int(r.n), boyut: int(r.b), yedekli: int(r.y), drive: dv ? 1 : 0, klasor: dv ? str(await gizliAyar(D, '_drive_klasor')) : '' });
    }
    case 'drive_bagla': { // Apps Script web uygulaması adresi + anahtarı
      const g = await girdi(); const url = str(g.url).trim(); const anahtar = str(g.anahtar).trim();
      if (!url && !anahtar) { await D.prepare("DELETE FROM ayarlar WHERE k IN ('_drive_url','_drive_anahtar','_drive_klasor')").run(); return json({ ok: 1, kaldirildi: 1 }); }
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) return json({ hata: 'Adres https://script.google.com/macros/s/…/exec biçiminde olmalı' }, 400);
      if (anahtar.length < 16) return json({ hata: 'Anahtar en az 16 karakter olmalı' }, 400);
      const r = await driveGonder({ url, anahtar }, { islem: 'ping' });
      if (!r || !r.ok) return json({ hata: 'Drive bağlantısı denendi ama olmadı: ' + str(r && r.hata) }, 400);
      const yaz = (k, v) => D.prepare('INSERT INTO ayarlar(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, v);
      await D.batch([yaz('_drive_url', url), yaz('_drive_anahtar', anahtar), yaz('_drive_klasor', str(r.klasor))]);
      return json({ ok: 1, klasor: str(r.klasor) });
    }
    case 'drive_yedekle': { // panel döngüyle çağırır; gun verilirse yalnızca o günden eski talepler
      const g = await girdi(); const dv = await driveAyar(D);
      if (!dv) return json({ hata: 'Google Drive bağlı değil' }, 400);
      const gun = int(g.gun);
      const y = await driveYedekle(D, dv, { sinir: gun ? simdi(Date.now() - Math.max(7, gun) * 86400000) : '', adet: 6 });
      if (y.hata && !y.yedeklenen) return json({ hata: 'Drive yedeği başarısız: ' + y.hata }, 502);
      return json(y);
    }
    // --- site metinleri (panelden düzenlenir) ---
    case 'metinler': {
      const { results } = await D.prepare('SELECT k, v FROM metinler').all();
      const o = {}; for (const r of results) o[r.k] = r.v; return json(o);
    }
    case 'metin_kaydet': { // {degerler: {anahtar: metin}} — boş metin varsayılana döndürür
      const g = await girdi(); const d = g.degerler && typeof g.degerler === 'object' ? g.degerler : {};
      const st = [];
      for (const [k, v] of Object.entries(d)) {
        if (!/^[a-z0-9_]{1,60}$/.test(k)) continue;
        const m = kes(str(v), 4000);
        st.push(m.trim() === '' ? D.prepare('DELETE FROM metinler WHERE k = ?').bind(k) : D.prepare('INSERT INTO metinler(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, m));
      }
      for (let i = 0; i < st.length; i += 50) await D.batch(st.slice(i, i + 50));
      return json({ ok: 1, adet: st.length });
    }
    case 'site_gorselleri': {
      const h = await gorselHaritasi(D); const o = {};
      for (const [k, v] of Object.entries(h)) if (k.startsWith('site/')) o[k.slice(5)] = v;
      return json(o);
    }

    // --- ayarlar ---
    case 'ayarlar': { const A = await ayarlar(D); delete A.sifre; return json(A); }
    case 'dogrula_durum_panel': {
      const A = await ayarlar(D);
      const b = await D.prepare("SELECT COUNT(*) n FROM tel_dogrula WHERE durum = 'onay' AND onay_zaman >= ?").bind(simdi().slice(0, 10)).first();
      return json({ canli: await kopruCanli(D), acik: A.tel_dogrulama !== '0', bugun: int(b && b.n) });
    }
    case 'ayar_kaydet': {
      const g = await girdi(); const d = {};
      for (const k of Object.keys(VARSAYILAN_AYARLAR)) if (k !== 'sifre' && k in g) d[k] = str(g[k]).trim();
      await ayarKaydet(D, d); return json({ ok: 1 });
    }
    case 'sifre_degistir': {
      const g = await girdi();
      if (!(await sifreDogrula(str(g.eski), sifre))) return json({ hata: 'Mevcut şifre hatalı.' }, 400);
      if (Array.from(str(g.yeni)).length < 6) return json({ hata: 'Yeni şifre en az 6 karakter olmalı.' }, 400);
      const oz = await sifreOzet(str(g.yeni));
      await ayarKaydet(D, { sifre: oz });
      // bu oturumu yeni şifreye taşı (diğer cihazlardaki oturumlar kapanır)
      const c = await oturumYaz(gizli, { e: Date.now() + OTURUM_SURE, c: oturum.c, s: oz.slice(-12) });
      return json({ ok: 1 }, 200, { 'Set-Cookie': cerezBaslik(CEREZ, c) });
    }
    case 'simule': { const g = await girdi(); return json(await teklifHesapla(D, g)); }
    case 'yedek_indir': return yedekIndir(D);

    default: return json({ hata: 'Bilinmeyen işlem' }, 404);
  }
}

// TSB'nin arşiv servisinden son Excel'i indirip tarayıcıya verir
async function tsbIndir() {
  const bas = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    Accept: 'application/json, text/javascript, */*; q=0.01', 'Accept-Language': 'tr-TR,tr;q=0.9', 'X-Requested-With': 'XMLHttpRequest',
    Referer: 'https://www.tsb.org.tr/tr/kasko-deger-listesi',
  };
  const al = async (yol) => {
    let r;
    try { r = await fetch('https://www.tsb.org.tr' + yol, { headers: bas, redirect: 'follow' }); } catch (e) { throw new Error('TSB yanıt vermedi (' + e.message + ')'); }
    if (r.status >= 400) throw new Error(`TSB yanıt vermedi (${r.status} )`);
    return r;
  };
  const jsonAl = async (yol) => { const t = await (await al(yol)).text(); try { return JSON.parse(t); } catch (e) { return null; } };
  try {
    const aylar = await jsonAl('/InsuranceData/GetMonthList');
    if (!Array.isArray(aylar)) throw new Error('TSB sitesi beklenen cevabı vermedi (bot koruması olabilir). TSB sitesinden Excel\'i indirip "Excel dosyası seç" ile yükleyin.');
    const ayId = {}; for (const x of aylar) if (x && x.MonthOrder != null && x.Id != null) ayId[int(x.MonthOrder)] = int(x.Id);
    let y = buYil(), m = buAy(), yol = '';
    for (let i = 0; i < 4 && !yol; i++) {
      if (ayId[m] !== undefined) {
        const j = await jsonAl(`/InsuranceData/GetInsuranceDataArchiveFile?Year=${y}&MonthId=${ayId[m]}`);
        if (typeof j === 'string' && j.trim() !== '') yol = j.trim(); else if (j && typeof j === 'object' && typeof j.Result === 'string' && j.Result) yol = j.Result.trim();
      }
      if (!yol) { m--; if (m < 1) { m = 12; y--; } }
    }
    if (!yol) throw new Error('TSB arşivinde son 4 ay için Excel bulunamadı.');
    const d = await al(yol.replace(/ /g, '%20'));
    return new Response(d.body, { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store',
      'X-Dosya': encodeURIComponent(yol.split('/').pop()), 'X-Donem': String(m).padStart(2, '0') + '.' + y } });
  } catch (e) {
    return json({ hata: 'Sunucu hatası: ' + e.message }, 500);
  }
}

// Tüm fiyatlar, talepler, ayarlar ve işlem geçmişi tek JSON dosyasında (TSB kataloğu hariç: o TSB'den yeniden alınır)
async function yedekIndir(D) {
  const tablolar = { metinler: 500, ayarlar: 2000, fiyatlar: 3000, versiyonlar: 1000, talepler: 400, mesajlar: 500, islemler: 5, model_eslestirme: 2000, kalibrasyon: 2000, robot_log: 200 };
  const parcalar = [];
  for (const [t, boy] of Object.entries(tablolar)) {
    const { results: kol } = await D.prepare(`PRAGMA table_info(${t})`).all();
    const obj = 'json_object(' + kol.map((c) => `'${c.name}', ${c.name}`).join(', ') + ')';
    const sat = [];
    for (let o = 0; ; o += boy) {
      const r = await D.prepare(`SELECT json_group_array(${obj}) j, COUNT(*) n FROM (SELECT * FROM ${t}${t === 'ayarlar' ? " WHERE k NOT IN ('_gizli', '_deneme')" : ''} ORDER BY rowid LIMIT ${boy} OFFSET ?)`).bind(o).first();
      if (!r || !int(r.n)) break;
      const ic = r.j.slice(1, -1); if (ic) sat.push(ic);
      if (int(r.n) < boy) break;
    }
    parcalar.push(`${JSON.stringify(t)}:[${sat.join(',')}]`);
  }
  const d = simdi().replace(/[-:]/g, '').replace(' ', '_');
  return new Response(`{"surum":1,"tarih":${JSON.stringify(simdi())},${parcalar.join(',')}}`, {
    headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="otokabul_yedek_${d}.json"`, 'Cache-Control': 'no-store' },
  });
}
