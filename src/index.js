// OTOKABUL Araç Alım — Cloudflare Worker girişi
// /api.php ve /yonetim/api.php adresleri eski PHP sürümüyle aynı kaldı; site ve panel dosyaları değişmeden çalışır.
import { siteApi } from './site.js';
import { yonetimApi } from './yonetim.js';
import { db } from './db.js';
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
  async fetch(req, env) {
    const yol = new URL(req.url).pathname;
    try {
      if (yol === '/api.php') return await siteApi(req, env);
      if (yol === '/yonetim/api.php') return await yonetimApi(req, env);
      if (yol.startsWith('/yuklemeler/')) return await gorselSun(req, env, yol);
    } catch (e) {
      console.error(e);
      return json({ hata: 'Sunucu hatası: ' + (e && e.message ? e.message : e) }, 500);
    }
    return env.ASSETS.fetch(req);
  },
};
