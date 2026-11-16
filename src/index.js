// OTOKABUL Araç Alım — Cloudflare Worker girişi
// /api.php ve /yonetim/api.php adresleri eski PHP sürümüyle aynı kaldı; site ve panel dosyaları değişmeden çalışır.
import { siteApi } from './site.js';
import { seoSayfa } from './seo.js';
import { yonetimApi } from './yonetim.js';
import { db, ayarlar, simdi, kes, str } from './db.js';
import { anlikBildir, baslikCoz } from './bildirim.js';
import { json } from './yardim.js';

async function gorselSun(req, env, yol) {
  const m = yol.match(/^\/yuklemeler\/(logo|model|site)\/([a-z0-9-]+)\.(png|jpg|webp)$/);
  if (!m) return new Response('Bulunamadı', { status: 404 });
  const D = await db(env);
  const g = await D.prepare('SELECT mime, parca FROM gorseller WHERE tur = ? AND ad = ?').bind(m[1], m[2]).first();
  if (!g) return new Response('Bulunamadı', { status: 404 });
  const { results } = await D.prepare('SELECT veri FROM gorsel_parca WHERE tur = ? AND ad = ? ORDER BY sira').bind(m[1], m[2]).all();
  const parcalar = results.map((r) => new Uint8Array(r.veri));
  return new Response(new Blob(parcalar), { headers: { 'Content-Type': g.mime, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
}

export default {
  async fetch(req, env, ctx) {
    const yol = new URL(req.url).pathname;
    try {
      if (yol === '/api.php') return await siteApi(req, env, ctx);
      if (yol === '/yonetim/api.php') return await yonetimApi(req, env);
      if (yol.startsWith('/yuklemeler/')) return await gorselSun(req, env, yol);
      if (yol === '/sitemap.xml' || yol === '/arac-degerleme' || yol.startsWith('/arac-degerleme/') || yol === '/rehber' || yol.startsWith('/rehber/')) return await seoSayfa(req, env, ctx, await db(env), yol);
    } catch (e) {
      console.error(e);
      return json({ hata: 'Sunucu hatası: ' + (e && e.message ? e.message : e) }, 500);
    }
    return env.ASSETS.fetch(req);
  },
  // bilgi@otokabul.com.tr'ye gelen e-postalar: Gmail'e iletilir, panele kaydedilir, WhatsApp'a haber verilir
  async email(message, env, ctx) {
    let D = null, A = {};
    try { D = await db(env); A = await ayarlar(D); } catch (e) { console.error(e); }
    const hedef = str(A.bildirim_eposta).trim() || 'kaniirfanozcan@gmail.com';
    await message.forward(hedef);
    const kimden = baslikCoz(message.headers.get('from') || message.from);
    const konu = baslikCoz(message.headers.get('subject') || '(konusuz)');
    const adres = (kimden.match(/<([^>]+)>/) || [, message.from])[1];
    const ad = kimden.replace(/<[^>]*>/, '').replace(/"/g, '').trim() || adres;
    if (D) ctx.waitUntil((async () => {
      const r = await D.prepare("INSERT INTO mesajlar(tarih, kaynak, ad, eposta, konu, mesaj, eposta_durum) VALUES(?, 'eposta', ?, ?, ?, ?, ?)")
        .bind(simdi(), kes(ad, 120), kes(adres, 120), kes(konu, 200), 'Tam metni ' + hedef + ' adresinde.', 'iletildi: ' + hedef).run();
      const wd = await anlikBildir(A, `📧 ${message.to} adresine yeni e-posta\nKimden: ${kimden}\nKonu: ${konu}`);
      await D.prepare('UPDATE mesajlar SET wa_durum = ? WHERE id = ?').bind(wd, r.meta.last_row_id).run();
    })().catch((e) => console.error(e)));
  },
};
