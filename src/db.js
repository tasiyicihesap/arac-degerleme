// OTOKABUL Araç Alım — veritabanı (Cloudflare D1)
import baslangic from './baslangic.json';

export const VARSAYILAN_AYARLAR = {
  firma_adi: 'OTOKABUL',
  firma_alt: '',
  telefon: '',
  whatsapp: '',
  eposta: '',
  adres: 'İstanbul',
  alim_marji: '10',
  aralik: '3',
  yuvarla: '5000',
  yillik_km: '18000',
  km_ceza: '1.2',
  km_bonus: '0.5',
  km_sinir: '15',
  lokal_boya: '0.5',
  boyali: '1.5',
  degisen: '3',
  tavan_kat: '2',
  tramer_kat: '0.6',
  tramer_sinir: '25',
  yil_kaybi: '6',
  yakit_Benzin: '0', yakit_Dizel: '0', yakit_LPG: '-4', yakit_Hibrit: '0', yakit_Elektrik: '0',
  vites_Manuel: '-2', vites_Otomatik: '2', 'vites_Yarı Otomatik': '0',
  teklif_goster: '1',
  min_yil: '2005',
  max_km: '350000',
  robot_url: 'https://raw.githubusercontent.com/tasiyicihesap/aracradar/main/data/meta.json',
  robot_min_adet: '3',
  robot_oto: '1',
  kasko_katsayi: '',
  versiyon_sinir: '35',
  kasko_kaynak: '',
  // sihirbazdaki donanım seçenekleri: etki = teklife % etkisi, kosul = '' (hepsi) | 'otomatik' | 'BMW, MINI' (marka listesi)
  donanim_liste: JSON.stringify([
    { ad: 'Sunroof (açılır tavan)', etki: 0, kosul: '' },
    { ad: 'Cam tavan (panoramik)', etki: 0, kosul: '' },
    { ad: 'Joystick vites', etki: 0, kosul: 'otomatik' },
    { ad: 'NBT multimedya / navigasyon', etki: 0, kosul: 'BMW, MINI' },
  ]),
  // parça bazlı boya-değişen kesintileri {"kaput":{"lokal":1,"boyali":3,"degisen":6}}; boş alan: genel formül
  parca_oranlari: '',
  // bildirimler: iletişim formu, bilgi@ adresine gelen e-postalar ve yeni teklif talepleri
  bildirim_eposta: 'kaniirfanozcan@gmail.com',
  wa_bildirim_tel: '905418673478',
  wa_bildirim_anahtar: '',
  bildirim_talep: '1',
  sifre: '',
};

const SEMA = `
CREATE TABLE IF NOT EXISTS ayarlar (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS fiyatlar (id INTEGER PRIMARY KEY AUTOINCREMENT, marka TEXT NOT NULL, model TEXT NOT NULL, yil INTEGER NOT NULL, piyasa INTEGER DEFAULT 0, onceki INTEGER DEFAULT 0, p25 INTEGER DEFAULT 0, p75 INTEGER DEFAULT 0, adet INTEGER DEFAULT 0, km_ort INTEGER DEFAULT 0, ayar REAL DEFAULT 0, elle INTEGER, kilit INTEGER DEFAULT 0, aktif INTEGER DEFAULT 1, kaynak TEXT DEFAULT 'robot', guncelleme TEXT, UNIQUE(marka, model, yil));
CREATE TABLE IF NOT EXISTS versiyonlar (marka TEXT, model TEXT, liste TEXT, PRIMARY KEY(marka, model));
CREATE TABLE IF NOT EXISTS talepler (id INTEGER PRIMARY KEY AUTOINCREMENT, tarih TEXT, ad TEXT, tel TEXT, il TEXT, marka TEXT, model TEXT, yil INTEGER, versiyon TEXT, yakit TEXT, vites TEXT, kasa TEXT, km INTEGER, renk TEXT, hasar TEXT, tramer INTEGER DEFAULT 0, agir INTEGER DEFAULT 0, baz INTEGER, teklif_min INTEGER, teklif_max INTEGER, detay TEXT, durum TEXT DEFAULT 'Yeni', notlar TEXT DEFAULT '', ip TEXT, anahtar TEXT, kabul_tarih TEXT);
CREATE TABLE IF NOT EXISTS islemler (id INTEGER PRIMARY KEY AUTOINCREMENT, tarih TEXT, aciklama TEXT, etkilenen INTEGER, yedek TEXT, geri_alindi INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS katalog_model (marka TEXT NOT NULL, model TEXT NOT NULL, v TEXT NOT NULL DEFAULT '[]', PRIMARY KEY(marka, model)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS model_eslestirme (id INTEGER PRIMARY KEY AUTOINCREMENT, marka TEXT, tsb TEXT, model TEXT);
CREATE TABLE IF NOT EXISTS kalibrasyon (marka TEXT PRIMARY KEY, oran REAL, ornek INTEGER);
CREATE TABLE IF NOT EXISTS robot_log (id INTEGER PRIMARY KEY AUTOINCREMENT, tarih TEXT, kaynak TEXT, kayit INTEGER, cozulen INTEGER, satir INTEGER, yeni INTEGER, degisim REAL, ozet TEXT);
CREATE TABLE IF NOT EXISTS gorseller (tur TEXT, ad TEXT, uz TEXT, mime TEXT, boyut INTEGER, parca INTEGER, zaman INTEGER, PRIMARY KEY(tur, ad));
CREATE TABLE IF NOT EXISTS talep_foto (id INTEGER PRIMARY KEY AUTOINCREMENT, talep_id INTEGER NOT NULL, mime TEXT, boyut INTEGER, veri BLOB);
CREATE INDEX IF NOT EXISTS ix_talep_foto ON talep_foto(talep_id);
CREATE TABLE IF NOT EXISTS metinler (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS mesajlar (id INTEGER PRIMARY KEY AUTOINCREMENT, tarih TEXT, kaynak TEXT DEFAULT 'form', ad TEXT, tel TEXT, eposta TEXT, konu TEXT, mesaj TEXT, ip TEXT, okundu INTEGER DEFAULT 0, eposta_durum TEXT, wa_durum TEXT);
CREATE TABLE IF NOT EXISTS gorsel_parca (tur TEXT, ad TEXT, sira INTEGER, veri BLOB, PRIMARY KEY(tur, ad, sira));
`;

// ---- yardımcılar ----
// Türkiye saati (UTC+3, yaz saati uygulaması yok)
export function trTarih(ms = Date.now()) { return new Date(ms + 3 * 3600 * 1000); }
const iki = (n) => String(n).padStart(2, '0');
export function simdi(ms) { const d = trTarih(ms); return `${d.getUTCFullYear()}-${iki(d.getUTCMonth() + 1)}-${iki(d.getUTCDate())} ${iki(d.getUTCHours())}:${iki(d.getUTCMinutes())}:${iki(d.getUTCSeconds())}`; }
export function bugun() { return simdi().slice(0, 10); }
export function buYil() { return trTarih().getUTCFullYear(); }
export function buAy() { return trTarih().getUTCMonth() + 1; }

// PHP round(): yarımda sıfırdan uzağa
export function yuvar(x, p = 0) {
  x = Number(x) || 0; const m = Math.pow(10, p);
  const v = Math.abs(x) * m; const r = Math.round(v * (1 + 1e-12));
  return (x < 0 ? -r : r) / m || 0;
}
export const int = (x) => { const n = typeof x === 'string' ? parseFloat(x) : Number(x); return Number.isFinite(n) ? Math.trunc(n) : 0; };
export const flt = (x) => { const n = typeof x === 'string' ? parseFloat(x) : Number(x); return Number.isFinite(n) ? n : 0; };
export const str = (x) => (x === null || x === undefined ? '' : typeof x === 'object' ? '' : String(x));
export const kes = (s, n) => Array.from(str(s)).slice(0, n).join('');
// PHP empty() karşılığı
export const dolu = (x) => !(x === undefined || x === null || x === false || x === 0 || x === '' || x === '0' || (Array.isArray(x) && !x.length));
// SQL içinde PHP round() karşılığı (kayan nokta hatasını PHP gibi yukarı toparlar)
export const R = (x, p) => `ROUND((${x}) * (1 + 1e-12)${p ? ', ' + p : ''})`;
export function medyan(a) { if (!a.length) return 0; a = a.slice().sort((x, y) => x - y); const n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; }
export function nf(n) { return String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/^/, n < 0 ? '-' : ''); }

// ---- bağlantı / kurulum ----
let hazir = null;
export async function db(env) {
  const D = env.DB;
  if (!hazir) hazir = kur(D).catch((e) => { hazir = null; throw e; });
  await hazir;
  return D;
}

// TSB kataloğu: her model tek satır (versiyonlar JSON dizisi). Ücretsiz planda 28.000+ versiyon
// ayrı satır olarak yazılınca günlük yazma kotası doluyordu. Sorgular için aynı sütunları veren görünüm:
const KATALOG_GORUNUM = `CREATE VIEW katalog AS SELECT CAST(json_extract(e.value,'$.id') AS INTEGER) id, m.marka marka, m.model model,
  json_extract(e.value,'$.versiyon') versiyon, json_extract(e.value,'$.tip') tip, json_extract(e.value,'$.kod') kod, json_extract(e.value,'$.kasa') kasa,
  json_extract(e.value,'$.yakit') yakit, json_extract(e.value,'$.vites') vites, json_extract(e.value,'$.motor') motor,
  CAST(json_extract(e.value,'$.beygir') AS INTEGER) beygir, CAST(json_extract(e.value,'$.aktif') AS INTEGER) aktif, json_extract(e.value,'$.degerler') degerler
  FROM katalog_model m, json_each(m.v) e`.replace(/\s*\n\s*/g, ' ');

async function kur(D) {
  await D.exec(SEMA.trim().split('\n').filter(Boolean).join('\n'));
  const kt = await D.prepare("SELECT type FROM sqlite_master WHERE name = 'katalog'").first();
  if (kt && kt.type === 'table') await D.batch([D.prepare('DROP INDEX IF EXISTS ix_katalog_mm'), D.prepare('DROP TABLE katalog')]);
  if (!kt || kt.type === 'table') await D.prepare(KATALOG_GORUNUM).run();
  // eski veritabanlarına yeni talep sütunları
  const { results: tk } = await D.prepare('PRAGMA table_info(talepler)').all();
  const varS = new Set(tk.map((c) => c.name)); const ek = [];
  if (!varS.has('donanim')) ek.push(D.prepare("ALTER TABLE talepler ADD COLUMN donanim TEXT DEFAULT ''"));
  if (!varS.has('aciklama')) ek.push(D.prepare("ALTER TABLE talepler ADD COLUMN aciklama TEXT DEFAULT ''"));
  if (!varS.has('foto_sayi')) ek.push(D.prepare('ALTER TABLE talepler ADD COLUMN foto_sayi INTEGER DEFAULT 0'));
  if (ek.length) await D.batch(ek);
  const r = await D.prepare("SELECT v FROM ayarlar WHERE k = '_kurulum'").first();
  if (r) return;
  // ilk açılış: AraçRadar'dan hazırlanmış başlangıç piyasa verisi
  await D.prepare("INSERT OR IGNORE INTO ayarlar(k, v) VALUES('_kurulum', ?)").bind(simdi()).run();
  const j = baslangic || {};
  if (Array.isArray(j.satirlar) && j.satirlar.length) {
    await piyasaYaz(D, JSON.stringify({ satirlar: j.satirlar, versiyonlar: j.versiyonlar || {} }), false);
    await D.prepare('INSERT INTO robot_log(tarih, kaynak, kayit, cozulen, satir, yeni, degisim, ozet) VALUES(?,?,?,?,?,?,?,?)')
      .bind(j.tarih || simdi(), 'Başlangıç verisi (AraçRadar)', int(j.toplamKayit), int(j.cozulen), j.satirlar.length, j.satirlar.length, 0, '').run();
  }
}

// ---- ayarlar ----
export async function ayarlar(D) {
  const c = { ...VARSAYILAN_AYARLAR };
  const { results } = await D.prepare("SELECT k, v FROM ayarlar WHERE k NOT LIKE '\\_%' ESCAPE '\\'").all();
  for (const r of results) c[r.k] = r.v;
  return c;
}
export async function ayarKaydet(D, d) {
  const st = D.prepare('INSERT INTO ayarlar(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v');
  const l = Object.entries(d).map(([k, v]) => st.bind(k, str(v)));
  if (l.length) await D.batch(l);
}
export async function gizliAyar(D, k) { const r = await D.prepare('SELECT v FROM ayarlar WHERE k = ?').bind(k).first(); return r ? r.v : null; }

// ---- robot sonuçlarını yazar (kilitli satırların piyasa fiyatına dokunmaz) ----
// govde: {"satirlar":[...], "versiyonlar":{...}} JSON metni — SQL içinde json_each ile açılır
const S_CTE = `WITH s AS (SELECT trim(COALESCE(json_extract(j.value,'$.marka'),'')) marka, trim(COALESCE(json_extract(j.value,'$.model'),'')) model,
  CAST(COALESCE(json_extract(j.value,'$.yil'),0) AS INTEGER) yil, CAST(COALESCE(json_extract(j.value,'$.medyan'),0) AS INTEGER) med,
  CAST(COALESCE(json_extract(j.value,'$.p25'),0) AS INTEGER) p25, CAST(COALESCE(json_extract(j.value,'$.p75'),0) AS INTEGER) p75,
  CAST(COALESCE(json_extract(j.value,'$.adet'),0) AS INTEGER) adet, CAST(COALESCE(json_extract(j.value,'$.km'),0) AS INTEGER) km
  FROM json_each(?1, '$.satirlar') j WHERE json_type(j.value) = 'object'),
  g AS (SELECT * FROM s WHERE marka <> '' AND model <> '' AND yil >= 1950 AND med > 0)`;

export async function piyasaYaz(D, govde, logla = true) {
  const t = simdi();
  const { results: once } = await D.prepare(`${S_CTE} SELECT g.marka, g.med, f.id, f.piyasa, f.kilit, f.kaynak FROM g LEFT JOIN fiyatlar f ON f.marka = g.marka AND f.model = g.model AND f.yil = g.yil`).bind(govde).all();
  let yeni = 0, guncel = 0, kilitli = 0; const oranlar = [], markaOran = {};
  for (const r of once) {
    if (r.id === null) yeni++;
    else if (r.kilit) kilitli++;
    else {
      if (r.piyasa > 0 && r.kaynak === 'robot') {
        const o = r.med / r.piyasa - 1;
        if (Math.abs(o) < 1) { oranlar.push(o); (markaOran[r.marka] ||= []).push(o); }
      }
      guncel++;
    }
  }
  await D.batch([
    D.prepare(`${S_CTE} INSERT INTO fiyatlar(marka, model, yil, piyasa, onceki, p25, p75, adet, km_ort, kaynak, guncelleme)
      SELECT marka, model, yil, med, 0, p25, p75, adet, km, 'robot', ?2 FROM g WHERE 1
      ON CONFLICT(marka, model, yil) DO UPDATE SET onceki = piyasa, piyasa = excluded.piyasa, p25 = excluded.p25, p75 = excluded.p75,
      adet = excluded.adet, km_ort = excluded.km_ort, kaynak = 'robot', guncelleme = excluded.guncelleme WHERE fiyatlar.kilit = 0`).bind(govde, t),
    D.prepare(`INSERT INTO versiyonlar(marka, model, liste)
      SELECT substr(j.key, 1, instr(j.key, '|') - 1) ma, substr(j.key, instr(j.key, '|') + 1) mo,
        CASE json_type(j.value) WHEN 'array' THEN json(j.value) ELSE (SELECT json_group_array(v.value) FROM json_each(j.value) v) END
      FROM json_each(?1, '$.versiyonlar') j
      WHERE json_type(?1, '$.versiyonlar') = 'object' AND json_type(j.value) IN ('array', 'object') AND instr(j.key, '|') > 1 AND length(j.key) > instr(j.key, '|')
      ON CONFLICT(marka, model) DO UPDATE SET liste = excluded.liste`).bind(govde),
  ]);
  await kaskoFiyatlariniGuncelle(D);
  const mo = {};
  const sirali = Object.entries(markaOran).filter(([, a]) => a.length >= 3).map(([m, a]) => [m, { oran: yuvar(medyan(a) * 100, 2), satir: a.length }]);
  sirali.sort((x, y) => y[1].satir - x[1].satir);
  for (const [m, v] of sirali) mo[m] = v;
  return { yeni, guncellenen: guncel, kilitli, genel_degisim: yuvar(medyan(oranlar) * 100, 2), marka: mo };
}

// ---- TSB kasko kataloğu ----
// katalog.degerler sütunu {"yil": deger} JSON'u tutar (ücretsiz plan yazma kotası için tek satır/versiyon)
export const KASKO_CTE = `ka AS (SELECT k.marka, k.model, CAST(d.key AS INTEGER) yil, AVG(d.value) ort FROM katalog k, json_each(k.degerler) d WHERE k.aktif = 1 GROUP BY k.marka, k.model, CAST(d.key AS INTEGER))`;

export async function katalogTemizle(D) { await D.prepare('DELETE FROM katalog_model').run(); }

// bir modelin versiyon dizisine yenilerini ekleyen ON CONFLICT parçası
export const MODEL_EKLE = `ON CONFLICT(marka, model) DO UPDATE SET v = (SELECT json_group_array(json(x.value)) FROM
  (SELECT value FROM json_each(katalog_model.v) UNION ALL SELECT value FROM json_each(excluded.v)) x)`;

const GECERLI = `json_type(j.value) = 'object' AND trim(COALESCE(json_extract(j.value,'$.marka'),'')) <> '' AND trim(COALESCE(json_extract(j.value,'$.model'),'')) <> ''
  AND json_type(j.value, '$.degerler') = 'object' AND (SELECT COUNT(*) FROM json_each(j.value, '$.degerler')) > 0`;

export async function katalogParcaYaz(D, govde) {
  const c = await D.prepare(`SELECT COUNT(*) n FROM json_each(?1, '$.liste') j WHERE ${GECERLI}`).bind(govde).first();
  const n = int(c && c.n); if (!n) return 0;
  const taban = int(await gizliAyar(D, '_kid'));
  await D.batch([
    D.prepare(`WITH g AS (SELECT j.key k, trim(COALESCE(json_extract(j.value,'$.marka'),'')) marka, trim(COALESCE(json_extract(j.value,'$.model'),'')) model,
        json_object('id', ?2 + ROW_NUMBER() OVER (ORDER BY j.key), 'versiyon', substr(COALESCE(json_extract(j.value,'$.versiyon'),''), 1, 120),
          'tip', substr(COALESCE(json_extract(j.value,'$.tip'),''), 1, 160), 'kod', COALESCE(json_extract(j.value,'$.kod'),''),
          'kasa', COALESCE(json_extract(j.value,'$.kasa'),''), 'yakit', COALESCE(json_extract(j.value,'$.yakit'),''), 'vites', COALESCE(json_extract(j.value,'$.vites'),''),
          'motor', COALESCE(json_extract(j.value,'$.motor'),''), 'beygir', CAST(COALESCE(json_extract(j.value,'$.beygir'),0) AS INTEGER), 'aktif', 1,
          'degerler', json((SELECT json_group_object(CAST(y AS TEXT), v) FROM (SELECT CAST(d.key AS INTEGER) y, CAST(${R('d.value')} AS INTEGER) v, MAX(d.id)
            FROM json_each(j.value, '$.degerler') d WHERE CAST(d.key AS INTEGER) >= 1950 AND ${R('d.value')} > 0 GROUP BY CAST(d.key AS INTEGER))))) o
        FROM json_each(?1, '$.liste') j WHERE ${GECERLI})
      INSERT INTO katalog_model(marka, model, v) SELECT marka, model, json_group_array(json(o)) FROM (SELECT * FROM g ORDER BY k) WHERE 1 GROUP BY marka, model
      ${MODEL_EKLE}`).bind(govde, taban),
    D.prepare("INSERT INTO ayarlar(k, v) VALUES('_kid', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(String(taban + n)),
  ]);
  return n;
}

// İlan medyanı / kasko ortalaması oranını marka bazında hesaplar, sonra her model-yıl için
// kasko × oran fiyat satırını oluşturur / günceller (sadece kaynağı 'kasko' ve kilitsiz olanları).
export async function kaskoFiyatlariniGuncelle(D) {
  const var_ = await D.prepare("SELECT 1 FROM katalog WHERE aktif = 1 AND degerler <> '{}' LIMIT 1").first();
  if (!var_) return { satir: 0 };
  const { results } = await D.prepare(`WITH ${KASKO_CTE} SELECT f.marka, f.piyasa * 1.0 / ka.ort o FROM fiyatlar f JOIN ka ON ka.marka = f.marka AND ka.model = f.model AND ka.yil = f.yil
    WHERE f.kaynak = 'robot' AND f.adet >= 5 AND f.piyasa > 0 AND ka.ort > 0`).all();
  const oranlar = {}, genel = [];
  for (const r of results) { if (r.o < 0.3 || r.o > 3) continue; (oranlar[r.marka] ||= []).push(r.o); genel.push(r.o); }
  const genelOran = genel.length ? medyan(genel) : 1.0;
  const A = await ayarlar(D);
  const elleS = str(A.kasko_katsayi).trim(); const elleN = flt(elleS.replace(',', '.'));
  const elle = elleS !== '' && elleN > 0 ? elleN : null;
  const kal = [['*', genelOran, genel.length]]; const mo = {};
  for (const [m, a] of Object.entries(oranlar)) if (a.length >= 5) { mo[m] = medyan(a); kal.push([m, mo[m], a.length]); }
  // yalnızca fiyatı değişen satırlar yazılır (ücretsiz planda günlük yazma kotası için); sayı tüm uygun satırlardır
  const H = `WITH ${KASKO_CTE}, h AS (SELECT ka.marka, ka.model, ka.yil, CAST(${R('ka.ort * COALESCE(?1, kb.oran, kg.oran) / 1000')} AS INTEGER) * 1000 p
        FROM ka LEFT JOIN kalibrasyon kb ON kb.marka = ka.marka AND kb.marka <> '*' LEFT JOIN kalibrasyon kg ON kg.marka = '*')`;
  const res = await D.batch([
    D.prepare('DELETE FROM kalibrasyon'),
    D.prepare("INSERT INTO kalibrasyon(marka, oran, ornek) SELECT json_extract(value,'$[0]'), json_extract(value,'$[1]'), json_extract(value,'$[2]') FROM json_each(?1)").bind(JSON.stringify(kal)),
    D.prepare(`${H} SELECT COUNT(*) n FROM h LEFT JOIN fiyatlar f ON f.marka = h.marka AND f.model = h.model AND f.yil = h.yil
      WHERE h.p > 0 AND (f.id IS NULL OR (f.kaynak = 'kasko' AND f.kilit = 0))`).bind(elle),
    D.prepare(`${H} INSERT INTO fiyatlar(marka, model, yil, piyasa, onceki, adet, kaynak, guncelleme) SELECT marka, model, yil, p, 0, 0, 'kasko', ?2 FROM h WHERE p > 0
      ON CONFLICT(marka, model, yil) DO UPDATE SET onceki = piyasa, piyasa = excluded.piyasa, guncelleme = excluded.guncelleme
      WHERE fiyatlar.kaynak = 'kasko' AND fiyatlar.kilit = 0 AND fiyatlar.piyasa <> excluded.piyasa`).bind(elle, simdi()),
  ]);
  return { satir: int(res[2].results[0].n), genel_oran: genelOran, marka_oran: mo };
}

// Motor/paket farkı: seçilen versiyonun kasko değeri / model-yıl ortalaması
export async function versiyonOrani(D, katalogId, yil) {
  const yol = `$."${int(yil)}"`;
  const v = await D.prepare('SELECT marka, model, versiyon, json_extract(degerler, ?2) deger FROM katalog WHERE id = ?1').bind(katalogId, yol).first();
  if (!v || v.deger === null || v.deger === undefined) return null;
  const o = await D.prepare('SELECT AVG(json_extract(degerler, ?3)) ort FROM katalog WHERE marka = ?1 AND model = ?2 AND aktif = 1 AND json_extract(degerler, ?3) IS NOT NULL').bind(v.marka, v.model, yol).first();
  const ort = flt(o && o.ort);
  if (ort <= 0) return null;
  return { oran: v.deger / ort, versiyon: v.versiyon, kasko: int(v.deger) };
}

// ---- görseller ----
import { LOGOLAR } from './logolar.js';
// donanım listesi (ayardaki JSON); bozuksa varsayılan
export function donanimlar(A) {
  try { const l = JSON.parse(A.donanim_liste || '[]'); if (Array.isArray(l)) return l.filter((d) => d && str(d.ad).trim()).map((d) => ({ ad: str(d.ad).trim(), etki: flt(d.etki), kosul: str(d.kosul).trim() })); } catch (e) {}
  return JSON.parse(VARSAYILAN_AYARLAR.donanim_liste);
}
export function gorselSlug(s) {
  const tr = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'Ö': 'o', 'Ş': 's', 'Ü': 'u', 'é': 'e', 'ë': 'e' };
  s = str(s).replace(/[çğıİöşüÇĞÖŞÜéë]/g, (c) => tr[c]).toLowerCase();
  return s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
// yüklenen görsellerin listesi (veri olmadan): "tur/ad" -> url
export async function gorselHaritasi(D) {
  const { results } = await D.prepare('SELECT tur, ad, uz, zaman FROM gorseller').all();
  const m = {}; for (const r of results) m[r.tur + '/' + r.ad] = `yuklemeler/${r.tur}/${r.ad}.${r.uz}?v=${r.zaman}`;
  return m;
}
export function logoUrl(h, marka) {
  const ad = gorselSlug(marka);
  if (h['logo/' + ad]) return h['logo/' + ad];
  if (LOGOLAR.has(ad)) return `assets/logolar/${ad}.png`;
  return '';
}
export function modelGorselUrl(h, marka, model) { return h['model/' + gorselSlug(marka) + '--' + gorselSlug(model)] || ''; }
