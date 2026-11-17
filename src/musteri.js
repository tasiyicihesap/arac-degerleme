// OTOKABUL — müşteriye otomatik WhatsApp mesajları
// Mesajları sunucu planlar; WhatsApp Web açık bilgisayardaki "Bildirim Köprüsü" eklentisi zamanı gelince gönderir.
//  · Randevu isteyene: hemen teşekkür + "sizi arayacağız" mesajı
//  · Randevu istemeyene: 1 gün, 3 gün ve 15 gün sonra birer hatırlatma; sonra bir daha yazılmaz
// Müşteriyi rahatsız etmemek için: yalnızca 09:00–20:00 arası, "DUR" yazana veya sohbette cevap verene bir daha
// takip mesajı gitmez, randevu alınca ya da panelde talebin durumu değişince bekleyen takipler iptal edilir,
// aynı numara yeniden değerleme yaparsa eski takipler silinip yeni seri başlar.
import { simdi, int, str } from './db.js';

const SAAT = 3600e3, GUN = 24 * SAAT;
export const TAKIP_PLANI = [['takip1', 1 * GUN], ['takip2', 3 * GUN], ['takip3', 15 * GUN]];
export const TUR_ADI = { deneme: 'Deneme mesajı', kabul1: 'Randevu teşekkürü', kabul2: '"Sizi arayacağız"', takip1: '1. gün hatırlatma', takip2: '3. gün hatırlatma', takip3: '15. gün son hatırlatma' };

export const telN = (t) => str(t).replace(/\D/g, '').slice(-10);
const telUluslar = (t) => { const n = telN(t); return n.length === 10 ? '90' + n : ''; };
const acikMi = (A) => str(A.musteri_mesaj) === '1';

async function retMi(D, tel) { return !!(await D.prepare('SELECT 1 FROM tel_ret WHERE tel = ?').bind(tel).first()); }

// yeni değerleme: aynı numaranın bekleyen takiplerini iptal et, 3 takip planla
export async function takipPlanla(D, A, talepId, tel) {
  if (!acikMi(A) || !tel || await retMi(D, tel)) return;
  const now = Date.now();
  await D.batch([
    D.prepare("UPDATE musteri_mesaj SET durum = 'iptal', sonuc = 'yeni değerleme yaptı', guncel = ? WHERE tel = ? AND durum = 'bekliyor' AND tur LIKE 'takip%'").bind(simdi(), tel),
    ...TAKIP_PLANI.map(([tur, ms]) => D.prepare('INSERT INTO musteri_mesaj(talep_id, tel, tur, zaman, guncel) VALUES(?,?,?,?,?)').bind(talepId, tel, tur, simdi(now + ms), simdi())),
  ]);
}

// randevu istedi: takipleri iptal et, teşekkür + "arayacağız" mesajlarını hemen sıraya koy
export async function kabulPlanla(D, A, talepId, tel) {
  if (!tel) return;
  const ops = [D.prepare("UPDATE musteri_mesaj SET durum = 'iptal', sonuc = 'randevu istedi', guncel = ? WHERE tel = ? AND durum = 'bekliyor' AND tur LIKE 'takip%'").bind(simdi(), tel)];
  if (acikMi(A)) {
    const now = Date.now();
    ops.push(D.prepare('INSERT INTO musteri_mesaj(talep_id, tel, tur, zaman, guncel) VALUES(?,?,?,?,?)').bind(talepId, tel, 'kabul1', simdi(now), simdi()));
    ops.push(D.prepare('INSERT INTO musteri_mesaj(talep_id, tel, tur, zaman, guncel) VALUES(?,?,?,?,?)').bind(talepId, tel, 'kabul2', simdi(now + 1000), simdi()));
  }
  await D.batch(ops);
}

// panelde durum "Yeni" dışına çıkınca (arandı, alındı, iptal…) bekleyen takipler durur
export async function durumDegisti(D, talepId, durum) {
  if (str(durum) === 'Yeni') return;
  await D.prepare("UPDATE musteri_mesaj SET durum = 'iptal', sonuc = ?, guncel = ? WHERE talep_id = ? AND durum = 'bekliyor' AND tur LIKE 'takip%'")
    .bind('durum: ' + str(durum), simdi(), int(talepId)).run();
}

function metinYap(A, sablon, t) {
  const ad = str(t.ad).trim().split(/\s+/)[0] || '';
  const adB = ad ? ad.charAt(0).toLocaleUpperCase('tr') + ad.slice(1).toLocaleLowerCase('tr') : '';
  const tf = (n) => new Intl.NumberFormat('tr-TR').format(int(n));
  const teklif = str(A.teklif_goster) === '1' && int(t.teklif_min) > 0 ? ` (ön teklifimiz: *${tf(t.teklif_min)} – ${tf(t.teklif_max)} TL*)` : '';
  const arac = [int(t.yil) || '', str(t.marka), str(t.model)].join(' ').trim();
  return str(sablon).replace(/\{ad\}/g, adB).replace(/\{arac\}/g, arac || 'aracınız').replace(/\{teklif\}/g, teklif)
    .replace(/\{firma\}/g, str(A.firma_adi) || 'OTOKABUL').replace(/\{tel\}/g, str(A.telefon) || '')
    .replace(/Merhaba  ?👋/, 'Merhaba 👋').replace(/Merhaba ,/, 'Merhaba,');
}

function saatUygun(A) {
  const [b, s] = str(A.musteri_saat || '9-20').split('-').map((x) => int(x));
  const h = int(simdi().slice(11, 13));
  return h >= (b || 9) && h < (s || 20);
}

// eklenti: zamanı gelen mesajları sahiplenip al
export async function mesajAl(D, A) {
  if (!acikMi(A) || !saatUygun(A)) return { mesajlar: [] };
  const sim = simdi(), eski = simdi(Date.now() - 600e3);
  const { results } = await D.prepare(`UPDATE musteri_mesaj SET durum = 'alındı', guncel = ?1
    WHERE id IN (SELECT id FROM musteri_mesaj WHERE zaman <= ?1 AND (durum = 'bekliyor' OR (durum = 'alındı' AND guncel < ?2)) ORDER BY zaman LIMIT 3)
    RETURNING id, talep_id, tel, tur, sonuc`).bind(sim, eski).all();
  const cikis = [];
  for (const m of results) {
    if (m.tur === 'deneme') { cikis.push({ id: int(m.id), talep: 0, tur: 'deneme', tel: telUluslar(m.tel), takip: false, metin: str(m.sonuc) }); continue; }
    const t = await D.prepare('SELECT id, ad, tel, marka, model, yil, teklif_min, teklif_max, durum, kabul_tarih FROM talepler WHERE id = ?').bind(m.talep_id).first();
    let iptal = '';
    if (!t) iptal = 'talep silindi';
    else if (await retMi(D, m.tel)) iptal = 'DUR yazmış';
    else if (str(m.tur).startsWith('takip') && (t.kabul_tarih || str(t.durum) !== 'Yeni')) iptal = 'durum: ' + str(t.durum);
    const uluslar = telUluslar(m.tel);
    if (!iptal && !uluslar) iptal = 'geçersiz numara';
    if (iptal) { await D.prepare("UPDATE musteri_mesaj SET durum = 'iptal', sonuc = ?, guncel = ? WHERE id = ?").bind(iptal, simdi(), m.id).run(); continue; }
    cikis.push({ id: int(m.id), talep: int(m.talep_id), tur: m.tur, tel: uluslar, takip: str(m.tur).startsWith('takip'), metin: metinYap(A, A['mm_' + m.tur], t) });
  }
  cikis.sort((a, b) => a.id - b.id);
  return { mesajlar: cikis };
}

// eklenti: gönderim sonucu. s = gonderildi | dur | yanit | yok | hata
export async function mesajSonuc(D, id, s, not) {
  const m = await D.prepare('SELECT id, tel, deneme FROM musteri_mesaj WHERE id = ?').bind(int(id)).first();
  if (!m) return;
  const sim = simdi();
  if (s === 'gonderildi') { await D.prepare("UPDATE musteri_mesaj SET durum = 'gönderildi', sonuc = '', guncel = ? WHERE id = ?").bind(sim, m.id).run(); return; }
  if (s === 'dur' || s === 'yanit' || s === 'yok') {
    const neden = s === 'dur' ? 'müşteri DUR yazdı' : s === 'yanit' ? 'müşteri sohbette cevap verdi' : 'numara WhatsApp kullanmıyor';
    const ops = [
      D.prepare("UPDATE musteri_mesaj SET durum = 'iptal', sonuc = ?, guncel = ? WHERE id = ?").bind(neden, sim, m.id),
      D.prepare(`UPDATE musteri_mesaj SET durum = 'iptal', sonuc = ?, guncel = ? WHERE tel = ? AND durum = 'bekliyor' ${s === 'dur' ? '' : "AND tur LIKE 'takip%'"}`).bind(neden, sim, m.tel),
    ];
    if (s === 'dur') ops.push(D.prepare('INSERT OR REPLACE INTO tel_ret(tel, tarih, neden) VALUES(?,?,?)').bind(m.tel, sim, 'DUR'));
    await D.batch(ops);
    return;
  }
  // hata: 3 denemeye kadar 15 dk sonra tekrar
  const d = int(m.deneme) + 1;
  if (d >= 3) await D.prepare("UPDATE musteri_mesaj SET durum = 'hata', deneme = ?, sonuc = ?, guncel = ? WHERE id = ?").bind(d, str(not).slice(0, 200), sim, m.id).run();
  else await D.prepare("UPDATE musteri_mesaj SET durum = 'bekliyor', deneme = ?, sonuc = ?, zaman = ?, guncel = ? WHERE id = ?").bind(d, str(not).slice(0, 200), simdi(Date.now() + 15 * 60e3), sim, m.id).run();
}

export async function talepMesajlari(D, talepId) {
  const { results } = await D.prepare('SELECT id, tur, zaman, durum, sonuc, guncel FROM musteri_mesaj WHERE talep_id = ? ORDER BY zaman, id').bind(int(talepId)).all();
  return results.map((r) => ({ ...r, ad: TUR_ADI[r.tur] || r.tur }));
}

// panel: deneme mesajı (verilen numaraya, şablonu örnek bilgilerle doldurup)
export async function denemePlanla(D, A, tel, tur) {
  const n = telN(tel);
  if (n.length !== 10) throw new Error('Geçerli bir cep telefonu numarası yazın.');
  const ornek = { ad: 'Ahmet', yil: 2018, marka: 'Renault', model: 'Megane', teklif_min: 640000, teklif_max: 665000 };
  const metin = '🧪 *DENEME MESAJI*\n\n' + metinYap(A, A['mm_' + tur] || A.mm_kabul1, ornek);
  await D.prepare("INSERT INTO musteri_mesaj(talep_id, tel, tur, zaman, sonuc, guncel) VALUES(0, ?, 'deneme', ?, ?, ?)").bind(n, simdi(), metin, simdi()).run();
}
export async function mesajOzet(D) {
  const [b, s, r] = await D.batch([
    D.prepare("SELECT COUNT(*) n FROM musteri_mesaj WHERE durum IN ('bekliyor','alındı')"),
    D.prepare("SELECT m.id, m.talep_id, m.tel, m.tur, m.zaman, m.durum, m.sonuc, m.guncel, t.ad FROM musteri_mesaj m LEFT JOIN talepler t ON t.id = m.talep_id ORDER BY m.guncel DESC, m.id DESC LIMIT 40"),
    D.prepare('SELECT tel, tarih FROM tel_ret ORDER BY tarih DESC LIMIT 100'),
  ]);
  return { bekleyen: int(b.results[0].n), son: s.results.map((x) => ({ ...x, ad_tur: TUR_ADI[x.tur] || x.tur })), ret: r.results };
}
