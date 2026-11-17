// OTOKABUL — marka / model temizliği
// Sitede yalnızca Türkiye'de satılan otomobil, arazi-SUV-pickup, elektrikli ve minivan-panelvan markaları görünür.
// Kamyon, otobüs, çekici, traktör, motosiklet ve karavan markaları ile kasko listesindeki bozuk / tekrar eden
// model adları pasife alınır (silinmez). Her çalıştırma "işlemler" listesine yazılır, panelden geri alınabilir.
import { simdi, str } from './db.js';

export const MARKA_IZIN_VARSAYILAN = [
  'Alfa Romeo', 'Audi', 'BMW', 'BYD', 'Chery', 'Chevrolet', 'Chrysler', 'Citroen', 'Cupra', 'Dacia', 'Daewoo', 'Daihatsu', 'Dodge',
  'DS Automobiles', 'Fiat', 'Ford', 'Geely', 'Honda', 'Hongqi', 'Hyundai', 'Infiniti', 'Isuzu', 'Jaecoo', 'Jaguar', 'Jeep', 'KGM', 'Kia',
  'Lada', 'Lancia', 'Land Rover', 'Leapmotor', 'Lexus', 'Lynk-Co', 'Maserati', 'Mazda', 'Mercedes-Benz', 'MG', 'MINI', 'Mitsubishi',
  'Nissan', 'Omoda', 'Opel', 'Peugeot', 'Polestar', 'Porsche', 'Proton', 'Renault', 'Rover', 'Saab', 'Seat', 'Seres', 'Skoda', 'Skywell',
  'Smart', 'Subaru', 'Suzuki', 'Tata', 'Tesla', 'Tofaş', 'Togg', 'Toyota', 'Volkswagen', 'Volvo', 'Voyah', 'Xpeng',
].join(',');

// ticari ağır vasıta, otobüs, özel amaçlı araç ve kasko listesindeki kısaltma/bozuk adlar
const AGIR = /(kamyon|cekici|çekici|otob[uü]s|minib[uü]s|okul|personel|cenaze|frigo|sasi|şasi|kabin|traktor|traktör|tadano|^canter|^fuso|^npr$|^nlr$|^nnr$|^fsr$|n-wide|^novo|visigo|^hd\d*$|f-max|f-line|^cargo|atego|actros|axor|tourismo|travego|conecto|citaro|intouro|^h-?100$|^h350$|^l300$|^(t|tr|tra|tran|trans)\.)/i;
const BOZUK = new Set(['the', 'cross', 'touraeg', 'highlinder', 'abart', 'latitute', 'spinter', 'mercedes', 'amg', 'mercedesamg', 'mercedes-amg', 'mercedes-maybach', 'mclaren', 'lexus', 'alpine', 'stevio', 'byd', 'jeep', 'wrangler', 'grandcherokee', 'omoda', 'grand c4picasso', 'grandc4picasso', 'ttr', 'my', 'mc', 'np', 'gr', 'm', 'r', 'v', 't.']);
const anahtar = (s) => str(s).toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/[^a-z0-9ğüşöç]/g, '');

export async function araclariTemizle(D, izinMetni, deneme) {
  const izin = new Set(str(izinMetni || MARKA_IZIN_VARSAYILAN).split(',').map((x) => x.trim()).filter(Boolean));
  const { results } = await D.prepare('SELECT id, marka, model, aktif, adet, kaynak, kilit FROM fiyatlar').all();
  // marka+model grupları
  const gr = new Map();
  for (const r of results) {
    const k = r.marka + '\u0000' + r.model;
    if (!gr.has(k)) gr.set(k, { marka: r.marka, model: r.model, ilan: false, satir: [] });
    const g = gr.get(k); g.satir.push(r); if (+r.adet > 0 || r.kaynak === 'robot') g.ilan = true;
  }
  // aynı markada ilan verisi olan modellerin sade adları (kasko'daki "Tourneoconnect" = "Tourneo Connect" tekrarlarını yakalamak için)
  const ilanAd = new Map(), kaskoAd = new Map();
  for (const g of gr.values()) if (g.ilan) ilanAd.set(g.marka + '|' + anahtar(g.model), g.model);
  const markaAnahtar = new Map(); // marka → modellerin sade adları
  for (const g of gr.values()) { if (!markaAnahtar.has(g.marka)) markaAnahtar.set(g.marka, []); markaAnahtar.get(g.marka).push(anahtar(g.model)); }
  const karar = new Map();
  for (const g of gr.values()) {
    const m = g.model, a = anahtar(m);
    let ok = izin.has(g.marka);
    if (ok && AGIR.test(m)) ok = false;
    if (ok && !g.ilan) {
      if (BOZUK.has(m.toLocaleLowerCase('tr')) || BOZUK.has(a)) ok = false;
      else if (!/\s/.test(m) && m.length >= 15) ok = false; // bitişik yazılmış uzun kasko adları
      else if (ilanAd.has(g.marka + '|' + a)) ok = false; // ilan verisindeki modelin tekrarı
      else if ((g.marka === 'BMW' || g.marka === 'Mercedes-Benz') && /^(m?\d{3}|1m$|[a-z]{1,3}\d{2}$)/i.test(m)) ok = false; // motor kodları (320i, C63…)
      else if (g.marka === 'BMW' && /^(İ|i)\d|^(İ|i)x|^m\d$/i.test(m)) ok = false; // ilan verisinde "i Serisi" / "M Serisi" var
      else if (g.marka === 'Ford' && /^transit\s/i.test(m) && !/^transit (connect|courier|custom|van|kombi)$/i.test(m)) ok = false; // Transit tonaj/şasi varyantları
      else if (g.marka === 'Ford' && /^tourneo \w+journey$/i.test(m)) ok = false
      else if (/\./.test(m) && !/^id\.\s?\d|^id\. buzz/i.test(m)) ok = false; // "Transitk.net", "T.connect"
      else if (/^[a-zçğıöşü]{4,}\d{3}|^\d{3,4}[a-z]{4,}/i.test(m)) ok = false; // "Transit350e", "3008ACTIVELIFE"
      else if (!/\s/.test(m) && markaAnahtar.get(g.marka).some((k) => k.length >= 4 && k !== a && a.startsWith(k))) ok = false; // "Traficpanelvan" → Trafic
      else if (m.length <= 2 && !/^[a-z]\d$/i.test(m) && m.toUpperCase() !== 'CC') ok = false;
      else {
        const kk = g.marka + '|' + a; // kasko içi tekrar: boşluklu / düzgün yazılmış olan kalır
        const onceki = kaskoAd.get(kk);
        if (onceki) { const iyi = /\s/.test(m) && !/\s/.test(onceki.model) ? g : onceki; const kotu = iyi === g ? onceki : g; karar.set(kotu, false); kaskoAd.set(kk, iyi); }
        else kaskoAd.set(kk, g);
      }
    }
    if (!karar.has(g)) karar.set(g, ok);
  }
  if (deneme) {
    const kapanan = {}, kalan = {};
    for (const [g, ok] of karar) { const h = ok ? kalan : kapanan; (h[g.marka] = h[g.marka] || []).push(g.model + (g.ilan ? '' : '*')); }
    return { kapanan, kalan };
  }
  const kapat = [], ac = [], yedek = [];
  for (const [g, ok] of karar) for (const r of g.satir) {
    const hedef = ok ? 1 : 0;
    if (+r.aktif === hedef) continue;
    if (hedef === 1 && +r.kilit) continue; // elle kilitlenmiş ve pasif bırakılmış satırlara dokunma
    (hedef ? ac : kapat).push(r.id); yedek.push({ id: r.id, aktif: +r.aktif });
  }
  if (!yedek.length) return { kapatilan: 0, acilan: 0 };
  const ops = [];
  for (let i = 0; i < kapat.length; i += 2000) ops.push(D.prepare('UPDATE fiyatlar SET aktif = 0 WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(kapat.slice(i, i + 2000))));
  for (let i = 0; i < ac.length; i += 2000) ops.push(D.prepare('UPDATE fiyatlar SET aktif = 1 WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ac.slice(i, i + 2000))));
  ops.push(D.prepare('INSERT INTO islemler(tarih, aciklama, etkilenen, yedek) VALUES(?,?,?,?)').bind(simdi(), `Marka/model temizliği: ${kapat.length} satır pasif, ${ac.length} satır aktif`, yedek.length, JSON.stringify(yedek)));
  ops.push(D.prepare("DELETE FROM ayarlar WHERE k = '_seo_liste'"));
  await D.batch(ops);
  return { kapatilan: kapat.length, acilan: ac.length };
}
