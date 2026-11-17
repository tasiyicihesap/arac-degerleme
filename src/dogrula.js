// OTOKABUL — müşteri telefon doğrulama (WhatsApp ile, SMS firması olmadan)
// Müşteri sitede "WhatsApp ile doğrula"ya basar → WhatsApp, içinde tek kullanımlık kod yazan hazır mesajla açılır →
// müşteri mesajı firmanın WhatsApp numarasına gönderir → WhatsApp Web açık bilgisayardaki köprü eklentisi kodu görür
// ve buraya bildirir → site birkaç saniye içinde "numaran doğrulandı" der.
// Köprü çalışmıyorsa (bilgisayar / WhatsApp Web kapalı) doğrulama istenmez; müşteri hiçbir zaman takılı kalmaz.
import { simdi, int, str, gizliAyar } from './db.js';
import { rastgeleHex } from './yardim.js';

const KOD_GECERLI_DK = 15;     // kod bu kadar dakika geçerli
const KOPRU_CANLI_SN = 150;    // köprü son bu kadar saniyede haber verdiyse "çalışıyor" sayılır
export const KOD_DESEN = /OTK[-\s]?(\d{6})/i;

const telN = (t) => str(t).replace(/\D/g, '').slice(-10);
export const telGoster = (t) => { const d = telN(t); return d.length === 10 ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : str(t); };

// köprü her "al" çağrısında (yaklaşık 30 sn'de bir) yaşadığını bildirir; en fazla dakikada bir yazılır
export async function kopruNabiz(D) {
  const t = Math.floor(Date.now() / 1000);
  await D.prepare("INSERT INTO ayarlar(k, v) VALUES('_kopru_son', ?1) ON CONFLICT(k) DO UPDATE SET v = excluded.v WHERE CAST(ayarlar.v AS INTEGER) < ?1 - 55").bind(String(t)).run();
}
export async function kopruCanli(D) {
  return Math.floor(Date.now() / 1000) - int(await gizliAyar(D, '_kopru_son')) <= KOPRU_CANLI_SN;
}
export async function dogrulamaGerekli(D, A) {
  return A.tel_dogrulama === '1' && str(A.whatsapp).replace(/\D/g, '').length >= 11 && await kopruCanli(D);
}

// site: kod üret
export async function dogrulaBaslat(D, A, ip, tel) {
  const n = telN(tel);
  if (n.length !== 10 || n[0] !== '5') return { hata: 'Lütfen geçerli bir cep telefonu numarası gir (05xx xxx xx xx).' };
  if (!(await dogrulamaGerekli(D, A))) return { gerekmez: 1 };
  const c = await D.prepare('SELECT COUNT(*) n FROM tel_dogrula WHERE ip = ? AND olusma > ?').bind(ip, simdi(Date.now() - 3600e3)).first();
  if (int(c.n) >= 12) return { hata: 'Çok fazla doğrulama denemesi yapıldı. Lütfen bizi telefonla ara.' };
  // aynı numaranın son 15 dk'daki bekleyen kodu varsa onu ver (müşteri geri dönüp tekrar basarsa kod değişmesin)
  const eski = await D.prepare("SELECT token, kod, durum, onay_tel FROM tel_dogrula WHERE tel = ? AND ip = ? AND olusma > ? ORDER BY olusma DESC LIMIT 1")
    .bind(n, ip, simdi(Date.now() - KOD_GECERLI_DK * 60e3)).first();
  let token, kod, durum = 'bekliyor', onayTel = '';
  if (eski) { token = eski.token; kod = eski.kod; durum = eski.durum; onayTel = eski.onay_tel; }
  else {
    token = rastgeleHex(16);
    for (let i = 0; i < 5; i++) {
      kod = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
      const v = await D.prepare("SELECT 1 FROM tel_dogrula WHERE kod = ? AND durum = 'bekliyor' AND olusma > ?").bind(kod, simdi(Date.now() - KOD_GECERLI_DK * 60e3)).first();
      if (!v) break;
    }
    await D.prepare('INSERT INTO tel_dogrula(token, kod, tel, ip, olusma) VALUES(?,?,?,?,?)').bind(token, kod, n, ip, simdi()).run();
    // eski kayıtları temizle
    await D.prepare('DELETE FROM tel_dogrula WHERE olusma < ?').bind(simdi(Date.now() - 7 * 864e5)).run();
  }
  // kod en başta: WhatsApp Web sohbet listesindeki önizlemede (ilk satır) görünsün diye
  const metin = `Doğrulama kodum: OTK-${kod}\n(OTOKABUL telefon doğrulama)`;
  return { token, kod, durum, tel: onayTel ? telGoster(onayTel) : '', wa: str(A.whatsapp).replace(/\D/g, ''), metin };
}

// site: durum sorgusu (sayfa 2 sn'de bir sorar)
export async function dogrulaDurum(D, token) {
  const r = await D.prepare('SELECT durum, onay_tel, olusma FROM tel_dogrula WHERE token = ?').bind(str(token)).first();
  if (!r) return { durum: 'yok' };
  if (r.durum !== 'onay' && str(r.olusma) < simdi(Date.now() - KOD_GECERLI_DK * 60e3)) return { durum: 'sure' };
  return { durum: r.durum, tel: r.durum === 'onay' ? telGoster(r.onay_tel) : '' };
}

// köprü: WhatsApp'a gelen mesajda kod görüldü
export async function dogrulaKopru(D, g) {
  const m = KOD_DESEN.exec(str(g.metin)) || KOD_DESEN.exec('OTK-' + str(g.kod));
  if (!m) return { ok: 0, neden: 'kod yok' };
  const r = await D.prepare("SELECT token, tel, durum FROM tel_dogrula WHERE kod = ? AND olusma > ? ORDER BY olusma DESC LIMIT 1")
    .bind(m[1], simdi(Date.now() - KOD_GECERLI_DK * 60e3)).first();
  if (!r) return { ok: 0, neden: 'kod bulunamadı / süresi geçmiş' };
  if (r.durum === 'onay') return { ok: 1, zaten: 1 };
  // gönderen numara okunabildiyse doğrulanan numara odur (müşterinin gerçekten ulaşılabilen WhatsApp numarası)
  const gonderen = telN(g.tel);
  const onay = gonderen.length === 10 && gonderen[0] === '5' ? gonderen : r.tel;
  await D.prepare("UPDATE tel_dogrula SET durum = 'onay', onay_tel = ?, onay_ad = ?, onay_zaman = ? WHERE token = ?").bind(onay, str(g.ad).slice(0, 80), simdi(), r.token).run();
  return { ok: 1, tel: telGoster(onay), farkli: onay !== r.tel ? 1 : 0 };
}

// teklif kaydında: doğrulanmış numara
export async function dogrulanmisTel(D, token) {
  if (!token) return null;
  const r = await D.prepare("SELECT onay_tel FROM tel_dogrula WHERE token = ? AND durum = 'onay' AND olusma > ?").bind(str(token), simdi(Date.now() - 6 * 3600e3)).first();
  return r ? r.onay_tel : null;
}
