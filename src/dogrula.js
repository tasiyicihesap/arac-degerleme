// OTOKABUL — müşteri telefon doğrulama (WhatsApp ile, SMS firması olmadan)
// Müşteri sihirbazın son adımında "Teklifimi göster"e basar → yazdığı numaraya WhatsApp'tan 6 haneli kod ve
// bir bağlantı gönderilir (gönderimi WhatsApp Web açık bilgisayardaki Bildirim Köprüsü eklentisi yapar) →
// müşteri kodu siteye yazar ya da mesajdaki bağlantıya dokunur → ön teklif görünür.
// Köprü çalışmıyorsa ya da kod 75 sn içinde gönderilemezse doğrulama atlanır; müşteri hiçbir zaman takılı kalmaz.
import { simdi, int, str, gizliAyar } from './db.js';
import { rastgeleHex } from './yardim.js';
import { anlikBildir } from './bildirim.js';

const KOD_GECERLI_DK = 15;     // kod bu kadar dakika geçerli
const KOPRU_CANLI_SN = 150;    // köprü son bu kadar saniyede haber verdiyse "çalışıyor" sayılır
const GONDERIM_BEKLE_SN = 90;  // kod bu sürede gönderilemezse doğrulama atlanır

const telN = (t) => str(t).replace(/\D/g, '').slice(-10);
export const telGoster = (t) => { const d = telN(t); return d.length === 10 ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : str(t); };
const gecerliSinir = () => simdi(Date.now() - KOD_GECERLI_DK * 60e3);
const gecikti = (r) => { const g = str(r.gonderim); return (g === 'sira' || g === 'gonderiliyor') && str(r.olusma) < simdi(Date.now() - GONDERIM_BEKLE_SN * 1000); };

// köprü her "al" çağrısında (yaklaşık 30 sn'de bir) yaşadığını bildirir; en fazla dakikada bir yazılır
export async function kopruNabiz(D) {
  const t = Math.floor(Date.now() / 1000);
  await D.prepare("INSERT INTO ayarlar(k, v) VALUES('_kopru_son', ?1) ON CONFLICT(k) DO UPDATE SET v = excluded.v WHERE CAST(ayarlar.v AS INTEGER) < ?1 - 55").bind(String(t)).run();
}
export async function kopruCanli(D) {
  return Math.floor(Date.now() / 1000) - int(await gizliAyar(D, '_kopru_son')) <= KOPRU_CANLI_SN;
}
export async function dogrulamaGerekli(D, A) {
  return A.tel_dogrulama === '1' && await kopruCanli(D);
}

function mesajMetni(token, kod) {
  return '✦ *OTOKABUL* ✦\n━━━━━━━━━━━━━━━━\n\n' +
    `🔐 Telefon doğrulama kodunuz: *${kod}*\n\n` +
    'Bu kodu www.otokabul.com.tr sayfasındaki doğrulama kutusuna yazabilir ya da ön teklifinizi görüntülemek için aşağıdaki bağlantıya dokunabilirsiniz:\n\n' +
    `👉 https://otokabul.com.tr/#dg=${token}.${kod}\n\n` +
    '_Kod 15 dakika süreyle geçerlidir. Bu talep size ait değilse mesajı dikkate almayınız._\n\n' +
    'Saygılarımızla,\n*OTOKABUL* · 🌐 www.otokabul.com.tr';
}

// site: kod üret ve WhatsApp gönderim sırasına koy
// Köprü kapalıyken müşteri gelirse sahibine haber ver (en fazla 3 saatte bir): doğrulama, grup bildirimi ve müşteri mesajları durmuş demektir
export async function kopruUyar(D, A) {
  try {
    const t = Math.floor(Date.now() / 1000);
    const r = await D.prepare("INSERT INTO ayarlar(k, v) VALUES('_kopru_uyari', ?1) ON CONFLICT(k) DO UPDATE SET v = excluded.v WHERE CAST(ayarlar.v AS INTEGER) < ?1 - 10800").bind(String(t)).run();
    if (!r.meta.changes) return;
    const son = int(await gizliAyar(D, '_kopru_son'));
    const sure = son ? Math.round((t - son) / 3600) : 0;
    await anlikBildir(A, `⚠️ OTOKABUL Bildirim Köprüsü çalışmıyor${sure ? ' (yaklaşık ' + sure + ' saattir)' : ''}.\nSitede müşteri var ama telefon doğrulama kodu, WhatsApp grup bildirimleri ve müşteri mesajları gönderilemiyor.\n\nÇözüm: eklentinin kurulu olduğu bilgisayarda Chrome'u açıp web.whatsapp.com sekmesini açık bırak.`);
  } catch (e) { console.error('köprü uyarısı', e); }
}
export async function dogrulaBaslat(D, A, ip, tel, yeniden) {
  const n = telN(tel);
  if (n.length !== 10 || n[0] !== '5') return { hata: 'Lütfen geçerli bir cep telefonu numarası gir (05xx xxx xx xx).' };
  if (!(await dogrulamaGerekli(D, A))) { if (A.tel_dogrulama === '1') await kopruUyar(D, A); return { gerekmez: 1 }; }
  // aynı numaranın son 15 dk'daki kodu varsa yenisi gönderilmez (müşteri geri dönüp tekrar basarsa)
  const eski = await D.prepare('SELECT token, durum, olusma FROM tel_dogrula WHERE tel = ? AND ip = ? AND olusma > ? ORDER BY olusma DESC LIMIT 1')
    .bind(n, ip, gecerliSinir()).first();
  // numara son 15 dk içinde bu tarayıcıdan zaten doğrulandıysa yeniden kod gönderilmez
  if (eski && eski.durum === 'onay') return { token: eski.token, tel: telGoster(n), zaten: 1 };
  if (eski && !(yeniden && str(eski.olusma) < simdi(Date.now() - 50e3))) return { token: eski.token, tel: telGoster(n) };
  const c = await D.prepare('SELECT COUNT(*) n FROM tel_dogrula WHERE (ip = ? OR tel = ?) AND olusma > ?').bind(ip, n, simdi(Date.now() - 3600e3)).first();
  if (int(c.n) >= 6) return { hata: 'Çok fazla doğrulama kodu istendi. Lütfen biraz sonra tekrar dene ya da bizi telefonla ara.' };
  const token = rastgeleHex(16);
  let kod = '';
  for (let i = 0; i < 5; i++) {
    kod = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    if (!(await D.prepare('SELECT 1 FROM tel_dogrula WHERE kod = ? AND olusma > ?').bind(kod, gecerliSinir()).first())) break;
  }
  await D.batch([
    D.prepare("INSERT INTO tel_dogrula(token, kod, tel, ip, olusma, gonderim) VALUES(?,?,?,?,?,'sira')").bind(token, kod, n, ip, simdi()),
    D.prepare('DELETE FROM tel_dogrula WHERE olusma < ?').bind(simdi(Date.now() - 7 * 864e5)),
  ]);
  return { token, tel: telGoster(n) };
}

// site: durum (sayfa 2 sn'de bir sorar)
export async function dogrulaDurum(D, token) {
  const r = await D.prepare('SELECT durum, gonderim, olusma FROM tel_dogrula WHERE token = ?').bind(str(token)).first();
  if (!r) return { durum: 'yok' };
  if (r.durum === 'onay') return { durum: 'onay' };
  if (str(r.olusma) < gecerliSinir()) return { durum: 'sure' };
  // kod zamanında gönderilemediyse (bilgisayar kapandı vb.) müşteri bekletilmez
  if (r.gonderim === 'hata' || gecikti(r) || (r.gonderim === 'sira' && !(await kopruCanli(D)))) return { durum: 'atla' };
  return { durum: 'bekliyor', gonderim: str(r.gonderim) };
}

// site: müşteri kodu yazdı (ya da mesajdaki bağlantıya dokundu)
export async function dogrulaKod(D, token, kod) {
  const r = await D.prepare('SELECT durum, kod, olusma, deneme FROM tel_dogrula WHERE token = ?').bind(str(token)).first();
  if (!r) return { hata: 'Doğrulama bulunamadı, lütfen yeni kod iste.', sure: 1 };
  if (r.durum === 'onay') return { ok: 1 };
  if (str(r.olusma) < gecerliSinir()) return { hata: 'Kodun süresi doldu, lütfen yeni kod iste.', sure: 1 };
  if (int(r.deneme) >= 6) return { hata: 'Çok fazla hatalı deneme yapıldı, lütfen yeni kod iste.', sure: 1 };
  if (str(kod).replace(/\D/g, '') !== str(r.kod)) {
    await D.prepare('UPDATE tel_dogrula SET deneme = deneme + 1 WHERE token = ?').bind(str(token)).run();
    return { hata: 'Kod hatalı. WhatsApp\'a gelen 6 haneli kodu kontrol et.' };
  }
  await D.prepare("UPDATE tel_dogrula SET durum = 'onay', onay_tel = tel, onay_zaman = ? WHERE token = ?").bind(simdi(), str(token)).run();
  return { ok: 1 };
}

// köprü: gönderilecek kodlar (en fazla 3); alınanlar "gonderiliyor" olur, 60 sn'de sonuç gelmezse yeniden verilir
export async function dogrulaAl(D) {
  const { results } = await D.prepare(`UPDATE tel_dogrula SET gonderim = 'gonderiliyor', gonderim_zaman = ?1
    WHERE token IN (SELECT token FROM tel_dogrula WHERE durum = 'bekliyor' AND olusma > ?2 AND (gonderim = 'sira' OR (gonderim = 'gonderiliyor' AND gonderim_zaman < ?3)) ORDER BY olusma LIMIT 3)
    RETURNING token, kod, tel`).bind(simdi(), simdi(Date.now() - GONDERIM_BEKLE_SN * 1000), simdi(Date.now() - 85e3)).all();
  return { kodlar: results.map((r) => ({ token: r.token, tel: '90' + r.tel, metin: mesajMetni(r.token, r.kod) })) };
}
export async function dogrulaSonuc(D, token, s) {
  const g = { gonderildi: 'gonderildi', yok: 'yok' }[str(s)] || 'hata';
  await D.prepare('UPDATE tel_dogrula SET gonderim = ?, gonderim_zaman = ? WHERE token = ?').bind(g, simdi(), str(token)).run();
}

// teklif kaydında: { tel, dogru: 1 } doğrulandı · { atla: 1 } kod gönderilemedi, doğrulamasız devam · null: doğrulanmadı
// onceki: bu doğrulamayla zaten bir talep oluştuysa (iki sekme / bağlantı) aynı sonuç döner, ikinci talep açılmaz
// aynı talebin iki kez açılmaması için imza: aynı kişi + aynı araç bilgileri + 15 dk içinde
export const talepImza = (g) => [g.ad, g.marka, g.model, g.yil, g.versiyon, g.km, g.renk, JSON.stringify(g.hasar || {}), g.tramer, g.agir ? 1 : 0].map((x) => str(x)).join('|');
function onceki(r, imza) {
  try { const o = JSON.parse(str(r.talep_sonuc) || 'null'); if (o && o.imza === imza && Date.now() - o.t < 15 * 60e3) return o.yanit; } catch (e) {}
  return null;
}
export async function dogrulaKarar(D, token, imza) {
  if (!token) return null;
  const r = await D.prepare('SELECT durum, onay_tel, gonderim, olusma, talep_sonuc FROM tel_dogrula WHERE token = ? AND olusma > ?').bind(str(token), simdi(Date.now() - 6 * 3600e3)).first();
  if (!r) return null;
  if (r.durum === 'onay') return { tel: r.onay_tel, dogru: 1, onceki: onceki(r, imza) };
  if (r.gonderim === 'hata' || gecikti(r)) return { atla: 1, onceki: onceki(r, imza) };
  return null;
}
export async function dogrulaTalepYaz(D, token, imza, sonuc) {
  if (token) await D.prepare('UPDATE tel_dogrula SET talep_sonuc = ? WHERE token = ?').bind(JSON.stringify({ imza, t: Date.now(), yanit: sonuc }), str(token)).run();
}

// WhatsApp'taki bağlantı: kod doğrulanır, bu doğrulamayla oluşan ön teklif (varsa) aracın bilgileriyle döner
export async function dogrulaTeklif(D, token, kod) {
  const k = await dogrulaKod(D, token, kod);
  if (k.hata) return k;
  const r = await D.prepare('SELECT talep_sonuc FROM tel_dogrula WHERE token = ?').bind(str(token)).first();
  let o = null; try { o = JSON.parse(str(r && r.talep_sonuc) || 'null'); } catch (e) {}
  const y = o && o.yanit;
  if (!y || !y.no) return { hazir: 0 };
  const t = await D.prepare('SELECT ad, tel, il, marka, model, yil, versiyon, km, kabul_tarih FROM talepler WHERE id = ? AND anahtar = ?').bind(int(y.no), str(y.anahtar)).first();
  if (!t) return { hazir: 0 };
  return { hazir: 1, sonuc: y, arac: { ad: t.ad, tel: t.tel, il: t.il, marka: t.marka, model: t.model, yil: int(t.yil), versiyon: t.versiyon || '', km: int(t.km) }, randevu: t.kabul_tarih ? 1 : 0 };
}
