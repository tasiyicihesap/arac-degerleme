// OTOKABUL — site istatistikleri (kendi sayacımız; çerez/3. taraf servis yok)
// Ziyaretçi kimliği tarayıcıda üretilen rastgele bir koddur; IP veya kişisel bilgi saklanmaz.
import { simdi, int, str, kes } from './db.js';
import { json } from './yardim.js';

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|axios|node-fetch|monitor|pingdom|uptime/i;

function cihazBul(ua, w) {
  if (/iPad|Tablet|SM-T|Tab\b/i.test(ua)) return 'Tablet';
  if (/Mobi|iPhone|Android.+Mobile|Windows Phone/i.test(ua)) return 'Mobil';
  if (/Android/i.test(ua)) return w && w < 900 ? 'Mobil' : 'Tablet';
  return 'Masaüstü';
}
function tarayiciBul(ua) {
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\/|Opera/i.test(ua)) return 'Opera';
  if (/YaBrowser/i.test(ua)) return 'Yandex Browser';
  if (/FBAN|FBAV/i.test(ua)) return 'Facebook uygulaması';
  if (/Instagram/i.test(ua)) return 'Instagram uygulaması';
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return 'TikTok uygulaması';
  if (/Firefox|FxiOS/i.test(ua)) return 'Firefox';
  if (/CriOS|Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  return 'Diğer';
}
function sistemBul(ua) {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/CrOS/i.test(ua)) return 'ChromeOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Diğer';
}
// trafik kaynağı: utm > reklam tıklama kimliği > yönlendiren site
function kaynakBul(ref, utm, gclid, fbclid, ua) {
  const u = str(utm).toLowerCase();
  const AD = [[/google|gads|adwords/, 'Google'], [/bing/, 'Bing'], [/yandex/, 'Yandex'], [/facebook|^fb$|meta/, 'Facebook'], [/instagram|^ig$/, 'Instagram'],
    [/tiktok/, 'TikTok'], [/twitter|^x$/, 'X (Twitter)'], [/youtube/, 'YouTube'], [/linkedin/, 'LinkedIn'], [/whatsapp|^wa$/, 'WhatsApp'], [/telegram/, 'Telegram'],
    [/sahibinden/, 'Sahibinden'], [/arabam/, 'Arabam.com'], [/mail|eposta|newsletter/, 'E-posta']];
  if (u) { for (const [r, ad] of AD) if (r.test(u)) return ad; return 'Kampanya: ' + kes(u, 30); }
  if (gclid) return 'Google Reklam';
  if (fbclid) return /Instagram/i.test(ua) ? 'Instagram' : 'Facebook';
  let host = '';
  try { host = new URL(ref).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { host = ''; }
  if (!host) {
    if (/Instagram/i.test(ua)) return 'Instagram';
    if (/FBAN|FBAV/i.test(ua)) return 'Facebook';
    if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return 'TikTok';
    return 'Doğrudan';
  }
  if (/otokabul\.com\.tr$|workers\.dev$/.test(host)) return 'Site içi';
  const H = [[/(^|\.)google\./, 'Google'], [/bing\.com/, 'Bing'], [/yandex\./, 'Yandex'], [/duckduckgo|yahoo|ecosia|brave/, 'Diğer arama'],
    [/facebook\.com|fb\.com|fb\.me/, 'Facebook'], [/instagram\.com/, 'Instagram'], [/tiktok\.com/, 'TikTok'], [/t\.co$|twitter\.com|x\.com/, 'X (Twitter)'],
    [/youtube\.com|youtu\.be/, 'YouTube'], [/linkedin\.com|lnkd\.in/, 'LinkedIn'], [/whatsapp\.com|wa\.me/, 'WhatsApp'], [/t\.me|telegram/, 'Telegram'],
    [/sahibinden\.com/, 'Sahibinden'], [/arabam\.com/, 'Arabam.com'], [/mail\.|outlook|gmail/, 'E-posta'], [/otoclass\.com\.tr/, 'OTOCLASS sitesi']];
  for (const [r, ad] of H) if (r.test(host)) return ad;
  return 'Diğer siteler';
}

// POST /api.php?a=iz  (navigator.sendBeacon)
export async function izKaydet(req, env, ctx, D) {
  const bos = new Response(null, { status: 204 });
  if (req.method !== 'POST') return bos;
  const ua = req.headers.get('User-Agent') || '';
  if (!ua || BOT.test(ua)) return bos;
  let g = {}; try { g = (await req.json()) || {}; } catch (e) { return bos; }
  const olay = str(g.o);
  if (!/^(goruntuleme|sihirbaz|teklif|mesaj|telefon|whatsapp|randevu)$/.test(olay)) return bos;
  const v = kes(str(g.v).replace(/[^a-z0-9]/gi, ''), 32), s = kes(str(g.s).replace(/[^a-z0-9]/gi, ''), 32);
  if (!v || !s) return bos;
  const cf = req.cf || {};
  const ref = str(g.r);
  const ilk = g.i ? 1 : 0;
  const kaynak = ilk ? kaynakBul(ref, g.u, g.g, g.f, ua) : '';
  let refHost = ''; try { refHost = ref ? new URL(ref).hostname.replace(/^www\./, '') : ''; } catch (e) {}
  const t = simdi();
  const is = D.prepare(`INSERT INTO ziyaretler(tarih, gun, saat, ziyaretci, oturum, ilk, olay, sayfa, kaynak, kaynak_site, utm_kampanya, utm_ortam, cihaz, tarayici, isletim, ulke, sehir, dil, ekran)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(t, t.slice(0, 10), int(t.slice(11, 13)), v, s, ilk, olay, kes(str(g.p), 120), kaynak, kes(refHost, 80),
    kes(str(g.k), 60), kes(str(g.m), 40), cihazBul(ua, int(g.w)), tarayiciBul(ua), sistemBul(ua), kes(str(cf.country), 4), kes(str(cf.city || cf.region), 60),
    kes(str(g.l).slice(0, 5), 8), int(g.w));
  const isler = [is.run()];
  // eski kayıtları ara sıra temizle (180 gün)
  if (Math.random() < 0.01) isler.push(D.prepare('DELETE FROM ziyaretler WHERE gun < ?').bind(simdi(Date.now() - 180 * 864e5).slice(0, 10)).run());
  const p = Promise.all(isler).catch(() => {});
  if (ctx) ctx.waitUntil(p); else await p;
  return bos;
}

// panel: ?a=istatistik&gun=7
export async function istatistikOzet(D, gun) {
  gun = Math.min(365, Math.max(1, int(gun) || 7));
  const bas = simdi(Date.now() - (gun - 1) * 864e5).slice(0, 10);
  const W = 'gun >= ?1';
  const ilk = `${W} AND ilk = 1`;
  const grup = (alan, kosul = ilk, lim = 12) => D.prepare(`SELECT ${alan} ad, COUNT(*) n FROM ziyaretler WHERE ${kosul} AND ${alan} <> '' GROUP BY ${alan} ORDER BY n DESC LIMIT ${lim}`).bind(bas);
  const q = [
    D.prepare(`SELECT COUNT(*) gor, COUNT(DISTINCT ziyaretci) ziy, SUM(ilk) otr FROM ziyaretler WHERE ${W} AND olay = 'goruntuleme'`).bind(bas),
    D.prepare(`SELECT olay ad, COUNT(DISTINCT oturum) n FROM ziyaretler WHERE ${W} AND olay <> 'goruntuleme' GROUP BY olay`).bind(bas),
    grup('kaynak'), grup('kaynak_site', `${ilk} AND kaynak NOT IN ('Doğrudan','Site içi')`), grup('cihaz'), grup('tarayici'), grup('isletim'),
    grup('sehir', ilk, 15), grup('sayfa', `${W} AND olay = 'goruntuleme'`, 15), grup('utm_kampanya'),
    D.prepare(`SELECT gun ad, COUNT(DISTINCT ziyaretci) ziy, COUNT(*) gor FROM ziyaretler WHERE ${W} AND olay = 'goruntuleme' GROUP BY gun ORDER BY gun`).bind(bas),
    D.prepare(`SELECT saat ad, COUNT(*) n FROM ziyaretler WHERE ${W} AND olay = 'goruntuleme' GROUP BY saat ORDER BY saat`).bind(bas),
    // kaynak bazında dönüşüm: o kaynaktan gelen oturumlardan kaçı teklif aldı
    D.prepare(`SELECT k.kaynak ad, COUNT(DISTINCT k.oturum) oturum, COUNT(DISTINCT t.oturum) teklif FROM ziyaretler k
      LEFT JOIN ziyaretler t ON t.oturum = k.oturum AND t.olay = 'teklif' WHERE k.gun >= ?1 AND k.ilk = 1 GROUP BY k.kaynak ORDER BY oturum DESC LIMIT 12`).bind(bas),
    D.prepare(`SELECT COUNT(*) n FROM talepler WHERE substr(tarih,1,10) >= ?1`).bind(bas),
    D.prepare(`SELECT COUNT(DISTINCT ziyaretci) n FROM ziyaretler WHERE ${W} AND olay = 'goruntuleme' AND ziyaretci IN (SELECT ziyaretci FROM ziyaretler WHERE gun < ?1)`).bind(bas),
  ];
  const r = await D.batch(q);
  const l = (i) => r[i].results;
  const o = {}; for (const x of l(1)) o[x.ad] = int(x.n);
  const t = l(0)[0] || {};
  return json({
    gun, bas, ozet: { goruntuleme: int(t.gor), ziyaretci: int(t.ziy), oturum: int(t.otr), geri_donen: int(l(14)[0].n), talep: int(l(13)[0].n), olaylar: o },
    kaynak: l(2), siteler: l(3), cihaz: l(4), tarayici: l(5), isletim: l(6), sehir: l(7), sayfa: l(8), kampanya: l(9), gunluk: l(10), saat: l(11), donusum: l(12),
  });
}
