// OTOKABUL — arama motorları için marka/model sayfaları ve site haritası
// Sayfalar sunucuda üretilir ve 1 gün önbellekte tutulur (ücretsiz plandaki okuma kotası için).
import { gorselSlug, int, str, buYil } from './db.js';
import { YAZILAR } from './rehber.js';

const SITE = 'https://otokabul.com.tr';
const SURE = 86400;
let listeOnbellek = null;

const h = (s) => str(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// aktif marka/model listesi (tek sorgu, 6 saat bellekte)
async function liste(D) {
  if (listeOnbellek && listeOnbellek.son > Date.now()) return listeOnbellek.v;
  // soğuk başlayan her Worker örneği fiyatlar tablosunu baştan taramasın: ham liste 6 saat Cloudflare önbelleğinde
  const ck = SITE + '/__seo_liste_v2', cache = typeof caches !== 'undefined' ? caches.default : null;
  let results = null;
  if (cache) { try { const c = await cache.match(ck); if (c) results = await c.json(); } catch (e) { results = null; } }
  if (!results) {
    // kenar önbelleği boşsa: hazır liste veritabanında tek satır olarak tutulur (10 bin satır yerine 1 satır okunur), 12 saatte bir yenilenir
    try {
      const r = await D.prepare("SELECT v FROM ayarlar WHERE k = '_seo_liste'").first();
      if (r && r.v) { const o = JSON.parse(r.v); if (o && o.t > Date.now() - 12 * 3600 * 1000 && Array.isArray(o.l)) results = o.l; }
    } catch (e) { results = null; }
    if (!results) {
      results = (await D.prepare('SELECT marka, model, MIN(yil) y1, MAX(yil) y2 FROM fiyatlar WHERE aktif = 1 GROUP BY marka, model').all()).results;
      try { await D.prepare("INSERT INTO ayarlar(k, v) VALUES('_seo_liste', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(JSON.stringify({ t: Date.now(), l: results })).run(); } catch (e) {}
    }
    if (cache) { try { await cache.put(ck, new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=21600' } })); } catch (e) {} }
  }
  const markalar = new Map();
  for (const r of results) {
    const ms = gorselSlug(r.marka), mos = gorselSlug(r.model);
    if (!ms || !mos) continue;
    if (!markalar.has(ms)) markalar.set(ms, { ad: r.marka, slug: ms, modeller: new Map() });
    const m = markalar.get(ms);
    if (!m.modeller.has(mos)) m.modeller.set(mos, { ad: r.model, slug: mos, y1: int(r.y1), y2: Math.min(int(r.y2), buYil() + 1) });
  }
  const v = [...markalar.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  for (const m of v) m.liste = [...m.modeller.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  listeOnbellek = { v, son: Date.now() + 6 * 3600 * 1000 };
  return v;
}

const ILETISIM = { tel: '0541 867 34 78', telLink: '+905418673478', wa: '905418673478', eposta: 'bilgi@otokabul.com.tr', adres: 'Yukarı Dudullu Mah. Göztepe Cad. No: 55-61A, Ümraniye / İstanbul' };

function sayfa({ baslik, aciklama, yol, kirinti, govde, ekLd = [] }) {
  const url = SITE + yol;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: kirinti.map((k, i) => ({ '@type': 'ListItem', position: i + 1, name: k[0], item: SITE + k[1] })),
  }, ...ekLd];
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(baslik)}</title>
<meta name="description" content="${h(aciklama)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:locale" content="tr_TR"><meta property="og:site_name" content="OTOKABUL.COM.TR">
<meta property="og:title" content="${h(baslik)}"><meta property="og:description" content="${h(aciklama)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/paylasim.png"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0f1b2d">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230f1b2d'/%3E%3Ctext x='32' y='43' font-family='Arial' font-weight='900' font-size='30' text-anchor='middle' fill='%23ff5a1f'%3EO%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=1117i"><link rel="stylesheet" href="/assets/anasayfa.css?v=1117i"><link rel="stylesheet" href="/assets/rehber.css?v=1117i">
${ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body class="ana rehber">
<header class="ust"><div class="kap ust-ic">
  <div class="marka-blok"><a class="logo logo-gorsel" href="/" aria-label="OTOKABUL.COM.TR ana sayfa"><img src="/assets/logo-otokabul.png" alt="OTOKABUL.COM.TR" width="160" height="50"></a><span class="isbirligi" title="OTOCLASS işbirliği ile"><img src="/assets/logo-otoclass.png" alt="OTOCLASS" width="88" height="20"><em>işbirliği ile</em></span></div>
  <nav><a href="/arac-degerleme/">Markalar</a><a href="/rehber/">Rehber</a><a href="/#nasil">Nasıl işliyor?</a><a href="/#sss">Sorular</a><a class="ust-tel" href="tel:${ILETISIM.telLink}">☎ <span>${ILETISIM.tel}</span></a><a class="ust-cta" href="/#degerle">Aracımı değerle</a></nav>
</div></header>
<main class="kap rh-ana">
<nav class="rh-kirinti" aria-label="Konum">${kirinti.map((k, i) => (i < kirinti.length - 1 ? `<a href="${k[1]}">${h(k[0])}</a><span>›</span>` : `<b>${h(k[0])}</b>`)).join('')}</nav>
${govde}
</main>
<footer class="alt-bilgi"><div class="kap alt-kolonlar">
  <div class="ak-marka"><a class="logo" href="/"><span class="logo-a">OTO</span><span class="logo-b">KABUL</span><span class="logo-c">.COM.TR</span></a><p>Aracını galeriye götürmeden, ilan vermeden; güncel piyasa fiyatıyla ve aynı gün ödemeyle sat.</p></div>
  <div><h4>Hizmetlerimiz</h4><a href="/#degerle">Aracını sat</a><a href="/#degerle">Ücretsiz ön teklif</a><a href="/#nasil">Ücretsiz ekspertiz</a></div>
  <div><h4>Rehber</h4><a href="/rehber/">Araç satış rehberi</a><a href="/arac-degerleme/">Marka marka araç değerleme</a><a href="/#fiyat">Fiyat nasıl belirleniyor?</a><a href="/#sss">Sık sorulanlar</a></div>
  <div><h4>İletişim</h4><a href="tel:${ILETISIM.telLink}">☎ ${ILETISIM.tel}</a><a href="https://wa.me/${ILETISIM.wa}" target="_blank" rel="noopener">WhatsApp</a><a href="mailto:${ILETISIM.eposta}">${ILETISIM.eposta}</a><span>${ILETISIM.adres}</span></div>
</div><div class="kap alt-son"><span>© ${buYil()} <b>OTOKABUL</b>.COM.TR · Tüm hakları saklıdır.</span><span>otokabul.com.tr</span></div></footer>
<a class="wa-sabit" href="https://wa.me/${ILETISIM.wa}?text=${encodeURIComponent('Merhaba, aracımı satmak istiyorum.')}" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z"/></svg></a>
<script src="/assets/iz.js?v=1117i" defer></script>
</body>
</html>`;
}

const cta = (metin, link) => `<div class="rh-cta"><div><b>${h(metin)}</b><span>Birkaç adımda bilgilerini gir, ön teklifin aynı ekranda çıksın. Ücretsiz ve kayıt gerektirmez.</span></div><a class="rh-btn" href="${link}">Ücretsiz değerle →</a></div>`;
const sihirbazLink = (marka, model, yil) => '/?' + new URLSearchParams({ marka, ...(model ? { model } : {}), ...(yil ? { yil: String(yil) } : {}) }).toString() + '#degerle';
const faqLd = (l) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: l.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const faqHtml = (l) => `<section class="rh-sss"><h2>Sık sorulanlar</h2>${l.map(([q, a]) => `<details><summary>${h(q)}</summary><p>${h(a)}</p></details>`).join('')}</section>`;

function anaSayfa(v) {
  const toplam = v.reduce((a, m) => a + m.liste.length, 0);
  const govde = `<section class="rh-bas"><h1>Marka marka araç değerleme</h1>
<p>Aracının markasını seç, modeline göre ücretsiz ön teklifini birkaç dakikada öğren. ${v.length} marka ve ${toplam} modeli değerliyoruz; ekspertiz ücretsiz, ödeme aynı gün.</p></section>
<div class="rh-izgara">${v.map((m) => `<a class="rh-kart" href="/arac-degerleme/${m.slug}/"><b>${h(m.ad)}</b><span>${m.liste.length} model</span></a>`).join('')}</div>
${cta('Markanı bulamadın mı?', '/#degerle')}`;
  return sayfa({ baslik: 'Araç Değerleme: Marka Marka Ücretsiz Ön Teklif | OTOKABUL.COM.TR', aciklama: `${v.length} marka ve ${toplam} model için ücretsiz araç değerleme. Aracının markasını seç, ön teklifini birkaç dakikada al; ekspertiz ücretsiz, ödeme aynı gün.`, yol: '/arac-degerleme/', kirinti: [['Ana sayfa', '/'], ['Araç değerleme', '/arac-degerleme/']], govde });
}

function markaSayfa(m) {
  const y1 = Math.min(...m.liste.map((x) => x.y1)), y2 = Math.max(...m.liste.map((x) => x.y2));
  const sss = [
    [`${m.ad} aracımı nasıl değerletirim?`, `Sitemizdeki değerleme ekranında ${m.ad} markasını, model yılını ve modelini seç; motor, paket, kilometre ve hasar bilgisini gir. Ön teklifin aynı ekranda çıkar, ücretsiz ekspertizden sonra kesin fiyatı veririz.`],
    [`Hangi ${m.ad} modellerini alıyorsunuz?`, `${m.liste.slice(0, 12).map((x) => x.ad).join(', ')}${m.liste.length > 12 ? ' ve diğer' : ''} ${m.ad} modellerini, ${y1}–${y2} model yılları arasında değerliyoruz.`],
    [`${m.ad} satarken ödeme ne zaman yapılır?`, 'Ekspertiz ve noter işlemleri tamamlandığı gün ödeme hesabına geçer. Noter işlemlerini biz takip ederiz.'],
  ];
  const govde = `<section class="rh-bas"><h1>${h(m.ad)} kaç para? Ücretsiz ${h(m.ad)} değerleme</h1>
<p>${h(m.ad)} aracını satmayı düşünüyorsan güncel piyasa değerini birkaç dakikada öğrenebilirsin. ${y1}–${y2} model yılları arasındaki ${m.liste.length} ${h(m.ad)} modeli için ücretsiz ön teklif veriyoruz. Teklif içine sinerse ekspertiz ücretsiz, noter işlemleri bizden, ödeme aynı gün.</p></section>
${cta(`${m.ad} aracını hemen değerle`, sihirbazLink(m.ad))}
<h2 class="rh-alt-baslik">${h(m.ad)} modelleri</h2>
<div class="rh-izgara">${m.liste.map((x) => `<a class="rh-kart" href="/arac-degerleme/${m.slug}/${x.slug}/"><b>${h(m.ad)} ${h(x.ad)}</b><span>${x.y1 === x.y2 ? x.y1 : x.y1 + '–' + x.y2}</span></a>`).join('')}</div>
${faqHtml(sss)}`;
  return sayfa({
    baslik: `${m.ad} Kaç Para? Ücretsiz ${m.ad} Değerleme ve Ön Teklif | OTOKABUL`,
    aciklama: `${m.ad} aracının güncel değerini öğren: ${m.liste.length} ${m.ad} modeli (${y1}–${y2}) için ücretsiz ön teklif, ücretsiz ekspertiz ve aynı gün ödeme.`,
    yol: `/arac-degerleme/${m.slug}/`, kirinti: [['Ana sayfa', '/'], ['Araç değerleme', '/arac-degerleme/'], [m.ad, `/arac-degerleme/${m.slug}/`]], govde, ekLd: [faqLd(sss)],
  });
}

async function modelSayfa(D, m, mo) {
  // katalogdaki motor / paket seçenekleri (tek satır okunur)
  let secenek = [];
  try {
    const r = await D.prepare('SELECT v FROM katalog_model WHERE marka = ? AND model = ?').bind(m.ad, mo.ad).first();
    const l = r ? JSON.parse(r.v) : [];
    const gr = new Map();
    for (const x of l) {
      if (!x || x.aktif === 0) continue;
      const hacim = parseFloat(x.motor) || 0, hp = int(x.beygir);
      const a = [hacim ? hacim.toFixed(1) : '', hp, str(x.yakit), str(x.vites)].join('|');
      if (!gr.has(a)) gr.set(a, { hacim, hp, yakit: str(x.yakit), vites: str(x.vites), kasa: new Set(), paket: 0 });
      const g = gr.get(a); g.paket++; if (x.kasa) g.kasa.add(str(x.kasa));
    }
    secenek = [...gr.values()].sort((a, b) => a.hacim - b.hacim || a.hp - b.hp).slice(0, 40);
  } catch (e) { secenek = []; }
  const ad = `${m.ad} ${mo.ad}`;
  const yillar = []; for (let y = mo.y2; y >= mo.y1; y--) yillar.push(y);
  const yakitlar = [...new Set(secenek.map((s) => s.yakit).filter(Boolean))], vitesler = [...new Set(secenek.map((s) => s.vites).filter(Boolean))];
  const sss = [
    [`${ad} kaç para?`, `${ad} aracının değeri model yılı, motor ve paket seçeneği, kilometresi, boya-değişen durumu ve tramer kaydına göre değişir. Değerleme ekranında bilgilerini girdiğinde güncel ön teklifini hemen görürsün.`],
    [`${ad} için hangi model yıllarını değerliyorsunuz?`, `${mo.y1 === mo.y2 ? mo.y1 + ' model' : mo.y1 + ' ile ' + mo.y2 + ' arasındaki model yıllarındaki'} ${ad} araçlarını değerliyoruz.`],
    [`${ad} boyalı ya da değişen parçası varsa teklif verir misiniz?`, 'Evet. Değerleme ekranındaki araç şemasında hangi parçanın lokal boyalı, boyalı ya da değişen olduğunu işaretlersin; teklif buna göre hesaplanır. Ağır hasar kayıtlı araçlar için ekspertiz sonrası özel değerlendirme yaparız.'],
    [`${ad} satarken nelere ihtiyacım var?`, 'Önce ücretsiz ön teklifini al. Ekspertiz ücretsizdir; noter satışı için gereken belgeleri uzmanımız randevudan önce sana tek tek bildirir. Noter işlemlerini biz takip ederiz, ödeme aynı gün yapılır.'],
  ];
  const diger = m.liste.filter((x) => x.slug !== mo.slug).slice(0, 18);
  const govde = `<section class="rh-bas"><h1>${h(ad)} kaç para? Ücretsiz ${h(ad)} değerleme</h1>
<p>${h(ad)} aracını satmak istiyorsan güncel değerini birkaç dakikada öğrenebilirsin. ${mo.y1 === mo.y2 ? mo.y1 : mo.y1 + '–' + mo.y2} model ${h(ad)} için ${secenek.length ? `${secenek.length} farklı motor seçeneğini ve donanım paketlerini ayrı ayrı hesaba katan` : 'aracına özel'} ücretsiz ön teklif veriyoruz.${yakitlar.length ? ` ${h(yakitlar.join(', '))} yakıt ve ${h(vitesler.join(' / '))} vites seçenekleri değerlemede dikkate alınır.` : ''}</p></section>
${cta(`${ad} aracını hemen değerle`, sihirbazLink(m.ad, mo.ad))}
<h2 class="rh-alt-baslik">Model yılını seç</h2>
<div class="rh-yillar">${yillar.map((y) => `<a href="${h(sihirbazLink(m.ad, mo.ad, y))}">${y}</a>`).join('')}</div>
${secenek.length ? `<h2 class="rh-alt-baslik">${h(ad)} motor ve donanım seçenekleri</h2>
<div class="rh-tablo"><table><thead><tr><th>Motor</th><th>Güç</th><th>Yakıt</th><th>Vites</th><th>Kasa</th><th>Paket</th></tr></thead><tbody>${secenek.map((s) => `<tr><td>${s.hacim ? s.hacim.toFixed(1) : '—'}</td><td>${s.hp ? s.hp + ' hp' : '—'}</td><td>${h(s.yakit || '—')}</td><td>${h(s.vites || '—')}</td><td>${h([...s.kasa].join(', ') || '—')}</td><td>${s.paket}</td></tr>`).join('')}</tbody></table></div>
<p class="rh-not">Değerleme ekranında önce motor seçeneğini, ardından o motora ait paketi seçersin; teklif seçtiğin pakete göre hesaplanır.</p>` : ''}
<section class="rh-etken"><h2 class="rh-alt-baslik">${h(ad)} fiyatını neler etkiler?</h2><ul>
<li><b>Model yılı ve kilometre:</b> Aynı yıldaki araçların ortalamasının altında kilometre teklifi yükseltir, üstü düşürür.</li>
<li><b>Motor ve paket:</b> Aynı modelin farklı motor ve donanım paketleri arasında belirgin fiyat farkı olabilir.</li>
<li><b>Boya, değişen ve tramer:</b> Parça parça işaretlediğin boya-değişen durumu ve tramer tutarı teklife yansır.</li>
<li><b>Yakıt, vites ve donanım:</b> Otomatik vites, sunroof, cam tavan gibi donanımlar değerlemede dikkate alınır.</li></ul></section>
${faqHtml(sss)}
${diger.length ? `<h2 class="rh-alt-baslik">Diğer ${h(m.ad)} modelleri</h2><div class="rh-izgara">${diger.map((x) => `<a class="rh-kart" href="/arac-degerleme/${m.slug}/${x.slug}/"><b>${h(m.ad)} ${h(x.ad)}</b><span>${x.y1 === x.y2 ? x.y1 : x.y1 + '–' + x.y2}</span></a>`).join('')}</div>` : ''}`;
  return sayfa({
    baslik: `${ad} Kaç Para? Ücretsiz ${ad} Değerleme | OTOKABUL`,
    aciklama: `${ad} (${mo.y1 === mo.y2 ? mo.y1 : mo.y1 + '–' + mo.y2}) aracının güncel değerini öğren. Motor ve pakete göre ücretsiz ön teklif, ücretsiz ekspertiz, aynı gün ödeme.`,
    yol: `/arac-degerleme/${m.slug}/${mo.slug}/`,
    kirinti: [['Ana sayfa', '/'], ['Araç değerleme', '/arac-degerleme/'], [m.ad, `/arac-degerleme/${m.slug}/`], [mo.ad, `/arac-degerleme/${m.slug}/${mo.slug}/`]], govde, ekLd: [faqLd(sss)],
  });
}

function rehberListe() {
  const govde = `<section class="rh-bas"><h1>Araç satış rehberi</h1>
<p>Aracını satmadan önce bilmen gerekenleri sade bir dille anlattık: hazırlık, ekspertiz, boya-değişen, tramer ve kilometrenin fiyata etkisi.</p></section>
<div class="rh-yazilar">${YAZILAR.map((y) => `<a class="rh-yazi-kart" href="/rehber/${y.slug}/"><b>${h(y.baslik)}</b><span>${h(y.ozet)}</span><i>Devamını oku →</i></a>`).join('')}</div>
${cta('Aracının değerini hemen öğren', '/#degerle')}`;
  return sayfa({ baslik: 'Araç Satış Rehberi: Ekspertiz, Boya-Değişen, Kilometre | OTOKABUL', aciklama: 'Aracını satarken bilmen gerekenler: satış öncesi hazırlık, ekspertiz raporu, boya-değişen ve tramerin fiyata etkisi, kilometre ve araç değeri.', yol: '/rehber/', kirinti: [['Ana sayfa', '/'], ['Rehber', '/rehber/']], govde });
}

function rehberYazi(y) {
  const diger = YAZILAR.filter((x) => x.slug !== y.slug);
  const govde = `<article class="rh-yazi"><h1>${h(y.baslik)}</h1>
<p class="rh-tarih">OTOKABUL.COM.TR · ${y.tarih.split('-').reverse().join('.')}</p>
${y.govde}</article>
${cta('Aracının değerini birkaç dakikada öğren', '/#degerle')}
${faqHtml(y.sss)}
<h2 class="rh-alt-baslik">Diğer rehber yazıları</h2>
<div class="rh-yazilar">${diger.map((x) => `<a class="rh-yazi-kart" href="/rehber/${x.slug}/"><b>${h(x.baslik)}</b><span>${h(x.ozet)}</span></a>`).join('')}</div>`;
  const art = { '@context': 'https://schema.org', '@type': 'Article', headline: y.baslik, description: y.aciklama, datePublished: y.tarih, dateModified: y.tarih, inLanguage: 'tr-TR', mainEntityOfPage: `${SITE}/rehber/${y.slug}/`, image: `${SITE}/assets/paylasim.png`, author: { '@type': 'Organization', name: 'OTOKABUL.COM.TR', url: SITE + '/' }, publisher: { '@type': 'Organization', name: 'OTOKABUL.COM.TR', logo: { '@type': 'ImageObject', url: `${SITE}/assets/paylasim.png` } } };
  return sayfa({ baslik: `${y.baslik} | OTOKABUL`, aciklama: y.aciklama, yol: `/rehber/${y.slug}/`, kirinti: [['Ana sayfa', '/'], ['Rehber', '/rehber/'], [y.baslik, `/rehber/${y.slug}/`]], govde, ekLd: [art, faqLd(y.sss)] });
}

function siteHaritasi(v) {
  const bugun = new Date().toISOString().slice(0, 10);
  const u = [[SITE + '/', '1.0'], [SITE + '/arac-degerleme/', '0.8']];
  u.push([SITE + '/rehber/', '0.7']); for (const y of YAZILAR) u.push([`${SITE}/rehber/${y.slug}/`, '0.7']);
  for (const m of v) { u.push([`${SITE}/arac-degerleme/${m.slug}/`, '0.7']); for (const x of m.liste) u.push([`${SITE}/arac-degerleme/${m.slug}/${x.slug}/`, '0.6']); }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${u.map(([l, p]) => `<url><loc>${l}</loc><lastmod>${bugun}</lastmod><priority>${p}</priority></url>`).join('\n')}\n</urlset>\n`;
}

const bulunamadi = () => new Response(sayfa({ baslik: 'Sayfa bulunamadı | OTOKABUL.COM.TR', aciklama: 'Aradığın sayfa bulunamadı.', yol: '/arac-degerleme/', kirinti: [['Ana sayfa', '/'], ['Araç değerleme', '/arac-degerleme/']], govde: `<section class="rh-bas"><h1>Bu sayfayı bulamadık</h1><p>Aracının markasını aşağıdaki listeden seçebilir ya da doğrudan değerleme ekranına geçebilirsin.</p></section>${cta('Aracını hemen değerle', '/#degerle')}<p><a href="/arac-degerleme/">Tüm markalar →</a></p>` }).replace('index, follow', 'noindex, follow'), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

export async function seoSayfa(req, env, ctx, dbAl, yol) {
  const url = new URL(req.url);
  // sonda / olmayan adresleri tek biçime getir
  if ((yol.startsWith('/arac-degerleme') || yol.startsWith('/rehber')) && !yol.endsWith('/')) return Response.redirect(url.origin + yol + '/' + url.search, 301);
  const anahtar = SITE + yol + '?s=6'; // sürüm: içerik değişince artır
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) { try { const c = await cache.match(anahtar); if (c) return c; } catch (e) {} }
  let govde, tur = 'text/html; charset=utf-8';
  // rehber yazıları veritabanına hiç dokunmaz
  if (yol.startsWith('/rehber/')) {
    const p = yol.split('/').filter(Boolean);
    if (p.length === 1) govde = rehberListe();
    else { const y = p.length === 2 && YAZILAR.find((x) => x.slug === p[1]); if (!y) return bulunamadi(); govde = rehberYazi(y); }
  }
  const D = govde ? null : await dbAl();
  const v = govde ? null : await liste(D);
  if (govde) { /* rehber */ }
  else if (yol === '/sitemap.xml') { govde = siteHaritasi(v); tur = 'application/xml; charset=utf-8'; }
  else {
    const p = yol.split('/').filter(Boolean); // ['arac-degerleme', marka?, model?]
    if (p.length === 1) govde = anaSayfa(v);
    else {
      const m = v.find((x) => x.slug === p[1]);
      if (!m) return bulunamadi();
      if (p.length === 2) govde = markaSayfa(m);
      else if (p.length === 3) { const mo = m.modeller.get(p[2]); if (!mo) return bulunamadi(); govde = await modelSayfa(D, m, mo); }
      else return bulunamadi();
    }
  }
  const basliklar = { 'Content-Type': tur, 'Cache-Control': 'public, max-age=3600' };
  if (cache && ctx) ctx.waitUntil(cache.put(anahtar, new Response(govde, { headers: { ...basliklar, 'Cache-Control': 'public, max-age=' + SURE } })).catch(() => {}));
  return new Response(govde, { headers: basliklar });
}
