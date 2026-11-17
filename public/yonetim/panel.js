/* OTOKABUL Araç Alım — Yönetim Paneli */
(function () {
  'use strict';
  var $ = function (s, k) { return (k || document).querySelector(s); };
  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var NF = new Intl.NumberFormat('tr-TR');
  var tl = function (n) { return n ? NF.format(Math.round(n)) : '—'; };
  var yuzde = function (n, isaret) { n = +n || 0; var s = (n > 0 && isaret !== false ? '+' : '') + n.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + '%'; return '<span class="' + (n > 0 ? 'art' : n < 0 ? 'azl' : '') + '">' + s + '</span>'; };
  var csrf = null;

  // Gemini'de üretilen manşet görselleri: Gemini sekmesi açık panele postMessage ile gönderir (yalnızca manşet alanları)
  window.addEventListener('message', function (e) {
    if (e.origin !== 'https://gemini.google.com') return;
    var d = e.data || {};
    if (d.tip !== 'otk_gorsel' || !/^(manset|promo|film)\d{1,2}$/.test(d.ad || '') || !/^data:image\/(jpeg|png|webp);base64,/.test(d.veri || '')) return;
    if (!csrf && !d.anahtar) return;
    fetch(d.veri).then(function (r) { return r.blob(); }).then(function (b) {
      var fd = new FormData();
      if (csrf) { fd.append('tur', 'site'); fd.append('marka', d.ad); fd.append('dosya', b, d.ad + '.jpg'); return fetch('api.php?a=gorsel_yukle', { method: 'POST', headers: { 'X-CSRF': csrf }, body: fd }) }
      fd.append('ad', d.ad); fd.append('dosya', b, d.ad + '.jpg');
      return fetch('/api.php?a=kopru&islem=gorsel&anahtar=' + encodeURIComponent(d.anahtar), { method: 'POST', body: fd }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.hata); return j; }); });
    }).then(function () { try { bildir(d.ad + ' görseli yüklendi'); } catch (x) {} if (e.source) e.source.postMessage({ tip: 'otk_tamam', ad: d.ad }, e.origin); })
      .catch(function (er) { if (e.source) e.source.postMessage({ tip: 'otk_hata', ad: d.ad, hata: String(er && er.message || er) }, e.origin); });
  });
  // aynı aktarım, adres çubuğuyla: #otkimg=mansetN|anahtar|data:image/jpeg;base64,...
  (function () {
    var h = location.hash; if (h.indexOf('#otkimg=') !== 0) return;
    var p = decodeURIComponent(h.slice(8)).split('|'); history.replaceState(null, '', location.pathname);
    if (p.length < 3 || !/^(manset|promo|film)\d{1,2}$/.test(p[0]) || !/^data:image\/(jpeg|png|webp);base64,/.test(p[2])) return;
    fetch(p[2]).then(function (r) { return r.blob(); }).then(function (b) {
      var fd = new FormData(); fd.append('ad', p[0]); fd.append('dosya', b, p[0] + '.jpg');
      return fetch('/api.php?a=kopru&islem=gorsel&anahtar=' + encodeURIComponent(p[1]), { method: 'POST', body: fd });
    }).then(function (r) { document.title = (r.ok ? '✓ ' : '✗ ') + p[0]; if (r.ok) setTimeout(function () { window.close(); }, 800); });
  })();
  function api(a, govde, sessiz) {
    return fetch('api.php?a=' + a, govde !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF': csrf || '' }, body: JSON.stringify(govde) } : { headers: { 'X-CSRF': csrf || '' } })
      .then(function (r) {
        return r.json().catch(function () { return { hata: 'Sunucu yanıtı okunamadı (' + r.status + ')' }; }).then(function (j) {
          if (r.status === 401 && a !== 'giris') { girisGoster(); throw new Error('Oturum kapandı'); }
          if (!r.ok) { if (!sessiz) bildir(j.hata || 'Hata', true); throw new Error(j.hata || 'Hata'); }
          return j;
        });
      });
  }
  function bildir(m, hata) {
    var d = document.createElement('div'); if (hata) d.className = 'hata'; d.textContent = m;
    $('#bildirim').appendChild(d); setTimeout(function () { d.remove(); }, hata ? 6000 : 3500);
  }

  // ---------- giriş ----------
  var kurulum = false;
  function girisGoster() {
    $('#uygulama').hidden = true; $('#girisEkrani').hidden = false;
    $('#girisBaslik').textContent = kurulum ? 'İlk kurulum' : 'Yönetim Paneli';
    $('#girisNot').textContent = kurulum ? 'Panel için bir şifre belirleyin (en az 6 karakter). Bu şifreyle giriş yapacaksınız.' : '';
    $('#girisSifre2').hidden = !kurulum; $('#girisBtn').textContent = kurulum ? 'Şifreyi kaydet ve gir' : 'Giriş';
    $('#girisSifre').focus();
  }
  $('#girisForm').onsubmit = function (e) {
    e.preventDefault(); $('#girisHata').textContent = '';
    var s = $('#girisSifre').value;
    if (kurulum && s !== $('#girisSifre2').value) { $('#girisHata').textContent = 'Şifreler aynı değil.'; return; }
    api(kurulum ? 'kurulum' : 'giris', { sifre: s }, true).then(function (j) { csrf = j.csrf; kurulum = false; baslat(); })
      .catch(function (e) { $('#girisHata').textContent = e.message; });
  };
  $('#cikis').onclick = function () { api('cikis', {}).then(function () { location.reload(); }); };

  api('durum').then(function (d) {
    kurulum = d.kurulum; csrf = d.csrf;
    if (d.giris) baslat(); else girisGoster();
  });

  // ---------- gezinme ----------
  var SAYFALAR = { ozet: cizOzet, talepler: cizTalepler, mesajlar: cizMesajlar, istatistik: cizIstatistik, fiyatlar: cizFiyatlar, toplu: cizToplu, robot: cizRobot, katalog: cizKatalog, icerik: cizIcerik, ayarlar: cizAyarlar };
  var markaListesi = [];
  function sayfa(ad, veri) {
    $$('#menu a').forEach(function (a) { a.classList.toggle('aktif', a.dataset.s === ad); });
    $$('[data-sayfa]').forEach(function (s) { s.hidden = s.dataset.sayfa !== ad; });
    location.hash = ad;
    SAYFALAR[ad]($('[data-sayfa="' + ad + '"]'), veri);
  }
  $('#menu').onclick = function (e) { var a = e.target.closest('a'); if (a) sayfa(a.dataset.s); };
  function baslat() {
    $('#girisEkrani').hidden = true; $('#uygulama').hidden = false;
    api('markalar').then(function (l) { markaListesi = l; });
    var h = location.hash.slice(1); sayfa(SAYFALAR[h] ? h : 'ozet');
    rozetGuncelle();
    otomatikRobot();
  }
  var sonRandevu = null, sonMesaj = null;
  setInterval(function () { if (!$('#uygulama').hidden && document.visibilityState === 'visible') rozetGuncelle(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && !$('#uygulama').hidden) rozetGuncelle(); });
  function rozetGuncelle() {
    api('rozet', undefined, true).then(function (o) {
      var n = o.talep_yeni + o.talep_randevu, r = $('#yeniRozet');
      r.hidden = !n; r.textContent = n; r.title = o.talep_randevu + ' randevu isteği, ' + o.talep_yeni + ' yeni talep';
      r.classList.toggle('randevu-var', o.talep_randevu > 0);
      document.title = (o.talep_randevu ? '(' + o.talep_randevu + ' randevu) ' : n ? '(' + n + ') ' : '') + 'Yönetim — OTOKABUL Araç Alım';
      if (sonRandevu !== null && o.talep_randevu > sonRandevu) bildir('📅 Yeni randevu isteği geldi!');
      sonRandevu = o.talep_randevu;
      var mr = $('#mesajRozet'), mn = +o.mesaj_yeni || 0; mr.hidden = !mn; mr.textContent = mn; mr.title = mn + ' okunmamış mesaj';
      if (sonMesaj !== null && mn > sonMesaj) bildir('✉️ Yeni mesaj geldi!');
      sonMesaj = mn;
    }).catch(function () {});
  }

  // ---------- ÖZET ----------
  // ---------- SİTE İSTATİSTİKLERİ ----------
  var istGun = 7;
  function cizIstatistik(k) {
    k.innerHTML = '<h1 class="bas">Site İstatistikleri</h1><p class="bas-alt">Ziyaretçilerin nereden geldiği, hangi cihaz ve tarayıcıyı kullandığı, kaçının teklif aldığı. Kendi sayacımızdır; çerez ve kişisel bilgi tutulmaz.</p>' +
      '<div class="satirlar" id="iDonem">' + [[1, 'Bugün'], [7, 'Son 7 gün'], [30, 'Son 30 gün'], [90, 'Son 90 gün']].map(function (d) { return '<button class="btn kucuk' + (d[0] === istGun ? ' koyu' : '') + '" data-g="' + d[0] + '">' + d[1] + '</button>'; }).join('') + '</div>' +
      '<div id="iIc">Yükleniyor…</div>';
    $('#iDonem', k).onclick = function (e) { var b = e.target.closest('[data-g]'); if (b) { istGun = +b.dataset.g; cizIstatistik(k); } };
    api('istatistik', { gun: istGun }).then(function (r) {
      var o = r.ozet, ol = o.olaylar || {}, NF0 = function (n) { return NF.format(n || 0); };
      var oran = function (a, b) { return b ? (Math.round(a / b * 1000) / 10).toString().replace('.', ',') + '%' : '—'; };
      var kart = function (b, d, alt) { return '<div class="ist-kart"><span>' + b + '</span><b>' + d + '</b>' + (alt ? '<small>' + alt + '</small>' : '') + '</div>'; };
      var cubuk = function (bas, l, etiket) {
        var top = l.reduce(function (a, x) { return a + (+x.n); }, 0), mx = Math.max.apply(null, l.map(function (x) { return +x.n; }).concat([1]));
        return '<div class="kutu ist-kutu"><h2>' + bas + '</h2>' + (l.length ? l.map(function (x) {
          return '<div class="ist-satir"><span title="' + esc(x.ad) + '">' + esc(etiket ? etiket(x.ad) : x.ad) + '</span><i><em style="width:' + Math.max(2, x.n / mx * 100) + '%"></em></i><b>' + NF0(x.n) + '</b><small>' + oran(x.n, top) + '</small></div>';
        }).join('') : '<p class="soluk">Henüz veri yok.</p>') + '</div>';
      };
      var gm = Math.max.apply(null, r.gunluk.map(function (x) { return +x.ziy; }).concat([1]));
      var sm = Math.max.apply(null, r.saat.map(function (x) { return +x.n; }).concat([1])), saat = {}; r.saat.forEach(function (x) { saat[x.ad] = +x.n; });
      $('#iIc', k).innerHTML =
        '<div class="ist-kartlar">' + kart('Tekil ziyaretçi', NF0(o.ziyaretci), NF0(o.geri_donen) + ' geri dönen') + kart('Oturum', NF0(o.oturum)) + kart('Sayfa görüntüleme', NF0(o.goruntuleme), o.oturum ? (Math.round(o.goruntuleme / o.oturum * 10) / 10).toString().replace('.', ',') + ' sayfa / oturum' : '') +
        kart('Değerlemeye başlayan', NF0(ol.sihirbaz), oran(ol.sihirbaz, o.oturum) + ' oturum') + kart('Teklif alan', NF0(ol.teklif), oran(ol.teklif, o.oturum) + ' dönüşüm') + kart('Randevu isteyen', NF0(ol.randevu)) + kart('Acil sat', NF0(ol.acil)) +
        kart('WhatsApp tıklaması', NF0(ol.whatsapp)) + kart('Telefon tıklaması', NF0(ol.telefon)) + kart('İletişim formu', NF0(ol.mesaj)) + '</div>' +
        '<div class="kutu"><h2>Günlük ziyaretçi</h2><div class="ist-grafik">' + (r.gunluk.length ? r.gunluk.map(function (x) {
          return '<div title="' + esc(x.ad) + ': ' + x.ziy + ' ziyaretçi, ' + x.gor + ' görüntüleme"><em style="height:' + Math.max(3, x.ziy / gm * 100) + '%"></em><span>' + x.ad.slice(8, 10) + '.' + x.ad.slice(5, 7) + '</span></div>';
        }).join('') : '<p class="soluk">Henüz veri yok.</p>') + '</div></div>' +
        '<div class="ist-izgara">' +
        cubuk('Nereden geldiler?', r.kaynak) +
        '<div class="kutu ist-kutu"><h2>Kaynağa göre teklif dönüşümü</h2>' + (r.donusum.length ? '<table class="xl"><tr><th>Kaynak</th><th>Oturum</th><th>Teklif</th><th>Oran</th></tr>' + r.donusum.map(function (x) { return '<tr><td>' + esc(x.ad || '—') + '</td><td>' + NF0(x.oturum) + '</td><td>' + NF0(x.teklif) + '</td><td>' + oran(x.teklif, x.oturum) + '</td></tr>'; }).join('') + '</table>' : '<p class="soluk">Henüz veri yok.</p>') + '</div>' +
        cubuk('Yönlendiren siteler', r.siteler) + cubuk('Reklam kampanyaları (utm)', r.kampanya) +
        cubuk('Cihaz', r.cihaz) + cubuk('İşletim sistemi', r.isletim) + cubuk('Tarayıcı', r.tarayici) + cubuk('Şehir', r.sehir) +
        cubuk('En çok bakılan sayfalar', r.sayfa, function (p) { return p === '/' ? 'Ana sayfa' : decodeURIComponent(p); }) +
        '<div class="kutu ist-kutu"><h2>Saatlere göre ziyaret</h2><div class="ist-grafik saatler">' + Array.apply(null, Array(24)).map(function (_, i) { var n = saat[i] || 0; return '<div title="' + i + ':00 — ' + n + '"><em style="height:' + Math.max(2, n / sm * 100) + '%"></em><span>' + (i % 3 === 0 ? i : '') + '</span></div>'; }).join('') + '</div></div>' +
        '</div>' +
        '<p class="alt-not">İpucu: Reklam bağlantılarına <code>?utm_source=instagram&amp;utm_campaign=kasim</code> gibi ekler koyarsan hangi kampanyanın teklif getirdiği burada ayrı görünür. Şehir bilgisi ziyaretçinin internet bağlantısından yaklaşık olarak belirlenir.</p>';
    }).catch(function () { $('#iIc', k).innerHTML = '<p class="azl">İstatistikler yüklenemedi.</p>'; });
  }
  function cizOzet(k) {
    k.innerHTML = '<h1 class="bas">Özet</h1><p class="bas-alt">Bugünün durumu</p><div id="oz">Yükleniyor…</div>';
    api('ozet').then(function (o) {
      var r = o.robot;
      $('#oz', k).innerHTML =
        '<div class="kartlar">' +
        '<div class="kart"><div class="s">Bugün gelen talep</div><div class="d">' + o.talep_bugun + '</div></div>' +
        '<div class="kart" style="border-color:#86efac;background:#f0fdf4"><div class="s">📅 Randevu isteyen</div><div class="d" style="color:var(--y)">' + o.talep_randevu + '</div></div>' +
        '<div class="kart"><div class="s">Bekleyen (Yeni)</div><div class="d">' + o.talep_yeni + ' <small>/ ' + o.talep_toplam + '</small></div></div>' +
        '<div class="kart"><div class="s">Fiyat satırı</div><div class="d">' + NF.format(o.satir) + '</div></div>' +
        '<div class="kart"><div class="s">Marka / model</div><div class="d">' + o.marka + ' <small>/ ' + o.model + '</small></div></div>' +
        '<div class="kart"><div class="s">Son robot taraması</div><div class="d" style="font-size:16px">' + (r ? esc(r.tarih) + '<br><small>' + NF.format(r.cozulen) + ' ilan · ' + (r.degisim ? yuzde(r.degisim) + ' piyasa' : '') + '</small>' : '—') + '</div></div>' +
        '</div>' +
        '<div class="iki-kolon"><div class="kutu"><h2>Son talepler</h2>' + talepTablosu(o.son_talepler, true) + '<div class="alt-not"><a data-git="talepler">Tümünü gör →</a></div></div>' +
        '<div class="kutu"><h2>Son fiyat işlemleri</h2>' + (o.islem.length ? '<table class="xl"><tr><th>Tarih</th><th>İşlem</th><th>Satır</th></tr>' + o.islem.map(function (i) { return '<tr><td>' + esc(i.tarih) + '</td><td>' + esc(i.aciklama) + (i.geri_alindi ? ' <span class="rozet">geri alındı</span>' : '') + '</td><td class="s">' + i.etkilenen + '</td></tr>'; }).join('') + '</table>' : '<p class="soluk">Henüz işlem yok.</p>') +
        '<div class="alt-not"><a data-git="toplu">Toplu fiyat değişimi →</a></div></div></div>';
      $$('[data-git]', k).forEach(function (a) { a.onclick = function () { sayfa(a.dataset.git); }; });
      $$('tr[data-id]', k).forEach(function (t) { t.onclick = function () { talepDetay(+t.dataset.id); }; });
    });
  }

  // ---------- TALEPLER ----------
  var DURUMLAR = ['Yeni', 'ACİL SAT', 'Randevu İstedi', 'Arandı', 'Ekspertiz', 'Alındı', 'Vazgeçti', 'Uygun değil'];
  var talepCache = [];
  function hasarOzet(h) {
    try { h = typeof h === 'string' ? JSON.parse(h) : h; } catch (e) { h = {}; }
    var s = { lokal: 0, boyali: 0, degisen: 0 }; Object.keys(h || {}).forEach(function (p) { s[h[p]]++; });
    var t = []; if (s.lokal) t.push(s.lokal + ' lokal'); if (s.boyali) t.push(s.boyali + ' boya'); if (s.degisen) t.push(s.degisen + ' değ.');
    return t.join(', ') || 'Hatasız';
  }
  function talepTablosu(l, kisa) {
    if (!l.length) return '<p class="soluk">Henüz talep yok.</p>';
    return '<div class="tablo-kap" style="max-height:none"><table class="xl"><tr><th>No</th><th>Tarih</th><th>Ad</th><th>Telefon</th>' + (kisa ? '' : '<th>İl</th>') + '<th>Araç</th><th>Km</th>' + (kisa ? '' : '<th>Hasar</th><th>Tramer</th>') + '<th>Ön teklif</th><th>Durum</th></tr>' +
      l.map(function (t) {
        return '<tr data-id="' + t.id + '" style="cursor:pointer"><td class="sat-no">' + t.id + '</td><td>' + esc(String(t.tarih).slice(5, 16)) + '</td><td>' + esc(t.ad) + '</td><td>' + esc(t.tel) + '</td>' + (kisa ? '' : '<td>' + esc(t.il) + '</td>') +
          '<td>' + esc(t.yil + ' ' + t.marka + ' ' + t.model) + '</td><td class="s">' + tl(t.km) + '</td>' + (kisa ? '' : '<td>' + hasarOzet(t.hasar) + (t.agir == 1 ? ' <b class="azl">AĞIR</b>' : '') + '</td><td class="s">' + (t.tramer ? tl(t.tramer) : '—') + '</td>') +
          '<td class="s">' + (t.teklif_min ? tl(t.teklif_min) + ' – ' + tl(t.teklif_max) : '<span class="soluk">ekspertiz</span>') + '</td><td><span class="rozet ' + esc(String(t.durum).split(' ')[0]) + '">' + esc(t.durum) + '</span></td></tr>';
      }).join('') + '</table></div>';
  }
  function cizTalepler(k) {
    k.innerHTML = '<h1 class="bas">Teklif Talepleri</h1><p class="bas-alt">Sitedeki değerleme formunu dolduran müşteriler. Satıra tıklayınca detay açılır.</p>' +
      '<div class="satirlar"><input class="girdi" id="tAra" placeholder="Ad, telefon, marka ara…" style="width:260px"><select class="girdi" id="tDurum"><option value="">Tüm durumlar</option>' + DURUMLAR.map(function (d) { return '<option>' + d + '</option>'; }).join('') + '</select>' +
      '<button class="btn" id="tCsv">Excel\'e aktar (CSV)</button></div><div id="tListe">Yükleniyor…</div>';
    var yukle = function () {
      api('talepler', { ara: $('#tAra', k).value, durum: $('#tDurum', k).value }).then(function (l) {
        talepCache = l; $('#tListe', k).innerHTML = talepTablosu(l);
        $$('tr[data-id]', k).forEach(function (t) { t.onclick = function () { talepDetay(+t.dataset.id); }; });
      });
    };
    var zaman; $('#tAra', k).oninput = function () { clearTimeout(zaman); zaman = setTimeout(yukle, 250); };
    $('#tDurum', k).onchange = yukle;
    $('#tCsv', k).onclick = function () {
      var bas = ['No', 'Tarih', 'Ad', 'Telefon', 'İl', 'Marka', 'Model', 'Yıl', 'Versiyon', 'Yakıt', 'Vites', 'Km', 'Renk', 'Hasar', 'Tramer', 'Ağır hasar', 'Teklif min', 'Teklif max', 'Durum', 'Not'];
      var sat = talepCache.map(function (t) { return [t.id, t.tarih, t.ad, t.tel, t.il, t.marka, t.model, t.yil, t.versiyon, t.yakit, t.vites, t.km, t.renk, hasarOzet(t.hasar), t.tramer, t.agir == 1 ? 'Evet' : 'Hayır', t.teklif_min, t.teklif_max, t.durum, t.notlar]; });
      csvIndir('teklif_talepleri.csv', [bas].concat(sat));
    };
    yukle();
  }
  function csvIndir(ad, satirlar) {
    var csv = '﻿' + satirlar.map(function (r) { return r.map(function (h) { h = h == null ? '' : String(h); return /[;"\n]/.test(h) ? '"' + h.replace(/"/g, '""') + '"' : h; }).join(';'); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = ad; a.click();
  }
  var PARCA_AD = { on_tampon: 'Ön Tampon', kaput: 'Motor Kaputu', tavan: 'Tavan', bagaj: 'Bagaj Kapağı', arka_tampon: 'Arka Tampon', sol_on_camurluk: 'Sol Ön Çamurluk', sol_on_kapi: 'Sol Ön Kapı', sol_arka_kapi: 'Sol Arka Kapı', sol_arka_camurluk: 'Sol Arka Çamurluk', sag_on_camurluk: 'Sağ Ön Çamurluk', sag_on_kapi: 'Sağ Ön Kapı', sag_arka_kapi: 'Sağ Arka Kapı', sag_arka_camurluk: 'Sağ Arka Çamurluk' };
  var DURUM_AD = { lokal: 'Lokal boyalı', boyali: 'Boyalı', degisen: 'Değişen' };
  // ---------- MESAJLAR (iletişim formu + bilgi@ adresine gelen e-postalar) ----------
  var mesajCache = [];
  function waNo(t) { t = String(t || '').replace(/\D/g, ''); if (t.indexOf('0') === 0) t = '9' + t; if (t.length === 10) t = '90' + t; return t; }
  function durumIkon(d) { d = String(d || ''); return !d || d === 'kapalı' ? '<span class="soluk">—</span>' : d.indexOf('hata') === 0 ? '<span class="azl" title="' + esc(d) + '">✗ hata</span>' : '<span class="art" title="' + esc(d) + '">✓</span>'; }
  function cizMesajlar(k) {
    k.innerHTML = '<h1 class="bas">Mesajlar</h1><p class="bas-alt">Sitedeki iletişim formundan gelen mesajlar ve bilgi@otokabul.com.tr adresine gelen e-postalar. Bildirim ayarları: Ayarlar → Bildirimler.</p>' +
      '<div class="satirlar"><select class="girdi" id="mFiltre"><option value="">Tümü</option><option value="yeni">Okunmamış</option><option value="form">Site formu</option><option value="eposta">E-posta</option></select><button class="btn" id="mHepsi">Hepsini okundu yap</button></div><div id="mListe">Yükleniyor…</div>';
    var ciz = function () {
      var f = $('#mFiltre', k).value;
      var l = mesajCache.filter(function (m) { return !f || (f === 'yeni' ? !+m.okundu : m.kaynak === f); });
      $('#mListe', k).innerHTML = !l.length ? '<p class="soluk">Mesaj yok.</p>' :
        '<div class="tablo-kap" style="max-height:none"><table class="xl"><tr><th>Tarih</th><th>Kaynak</th><th>Ad</th><th>Telefon / e-posta</th><th>Mesaj</th><th title="Gönderilen e-posta bildirimi">E-posta</th><th title="Telefona giden anlık bildirim (Telegram / WhatsApp)">Telefon</th></tr>' +
        l.map(function (m) {
          var ozet = (m.kaynak === 'eposta' ? m.konu : m.mesaj) || '';
          return '<tr data-mid="' + m.id + '" style="cursor:pointer' + (+m.okundu ? '' : ';font-weight:700') + '"><td>' + esc(String(m.tarih).slice(5, 16)) + '</td><td>' + (m.kaynak === 'eposta' ? '📧 E-posta' : '📝 Form') + (+m.okundu ? '' : ' <span class="rozet Yeni">yeni</span>') + '</td><td>' + esc(m.ad) + '</td><td>' + esc([m.tel, m.eposta].filter(Boolean).join(' · ')) + '</td>' +
            '<td>' + esc(ozet.length > 70 ? ozet.slice(0, 70) + '…' : ozet) + '</td><td>' + (m.kaynak === 'eposta' ? '<span class="art" title="' + esc(m.eposta_durum) + '">↪ iletildi</span>' : durumIkon(m.eposta_durum)) + '</td><td>' + durumIkon(m.wa_durum) + '</td></tr>';
        }).join('') + '</table></div>';
      $$('tr[data-mid]', k).forEach(function (t) { t.onclick = function () { mesajDetay(+t.dataset.mid); }; });
    };
    var yukle = function () { api('mesajlar').then(function (l) { mesajCache = l; ciz(); }); };
    $('#mFiltre', k).onchange = ciz;
    $('#mHepsi', k).onclick = function () { api('mesaj_okundu', { hepsi: 1 }).then(function () { yukle(); rozetGuncelle(); }); };
    yukle();
  }
  function mesajDetay(id) {
    var m = mesajCache.find(function (x) { return +x.id === id; }); if (!m) return;
    var tel = waNo(m.tel);
    $('#cekmeceIc').innerHTML = '<div class="satirlar" style="justify-content:space-between"><h2>' + esc(m.ad) + '</h2><button class="btn kucuk" id="kapat">Kapat ✕</button></div>' +
      '<div class="satirlar">' + (m.tel ? '<a class="btn koyu" href="tel:' + esc(m.tel) + '">📞 Ara</a><a class="btn" style="background:#25d366;color:#fff;border-color:#25d366" target="_blank" href="https://wa.me/' + tel + '?text=' + encodeURIComponent('Merhaba ' + m.ad + ', OTOKABUL\'dan yazıyoruz. Mesajınızı aldık.') + '">WhatsApp</a>' : '') +
      (m.eposta ? '<a class="btn" href="mailto:' + esc(m.eposta) + '?subject=' + encodeURIComponent('Re: ' + (m.konu || 'OTOKABUL')) + '">✉️ E-postayla yanıtla</a>' : '') + '</div>' +
      '<dl class="bilgi"><dt>Tarih</dt><dd>' + esc(m.tarih) + '</dd><dt>Kaynak</dt><dd>' + (m.kaynak === 'eposta' ? 'bilgi@otokabul.com.tr adresine gelen e-posta' : 'Site iletişim formu') + '</dd>' +
      (m.tel ? '<dt>Telefon</dt><dd>' + esc(m.tel) + '</dd>' : '') + (m.eposta ? '<dt>E-posta</dt><dd>' + esc(m.eposta) + '</dd>' : '') + (m.konu ? '<dt>Konu</dt><dd>' + esc(m.konu) + '</dd>' : '') +
      '<dt>Mesaj</dt><dd style="white-space:pre-wrap">' + esc(m.mesaj) + '</dd><dt>E-posta bildirimi</dt><dd>' + esc(m.eposta_durum || '—') + '</dd><dt>Telefon bildirimi</dt><dd>' + esc(m.wa_durum || '—') + '</dd></dl>' +
      '<div class="satirlar" style="margin-top:12px"><button class="btn" id="mOk">' + (+m.okundu ? 'Okunmadı yap' : 'Okundu yap') + '</button><button class="btn kirmizi" id="mSil">Sil</button></div>';
    $('#cekmece').hidden = false;
    $('#kapat').onclick = kapat;
    if (!+m.okundu) api('mesaj_okundu', { id: m.id }, true).then(function () { m.okundu = 1; $('#mOk').textContent = 'Okunmadı yap'; rozetGuncelle(); });
    $('#mOk').onclick = function () { var y = +m.okundu ? 0 : 1; api('mesaj_okundu', { id: m.id, okundu: y }).then(function () { m.okundu = y; kapat(); yenile(); }); };
    $('#mSil').onclick = function () { if (confirm('Bu mesaj silinsin mi?')) api('mesaj_sil', { id: m.id }).then(function () { bildir('Silindi'); kapat(); yenile(); }); };
  }
  function mmDurum(m) {
    var r = { 'bekliyor': '<span class="soluk">⏳ Bekliyor</span>', 'alındı': '<span class="soluk">📤 Gönderiliyor</span>', 'gönderildi': '<span class="art">✓ Gönderildi</span>', 'iptal': '<span class="soluk">✕ İptal</span>', 'hata': '<span class="azl">⚠ Gönderilemedi</span>' }[m.durum] || esc(m.durum);
    return r + (m.sonuc && m.tur !== 'deneme' ? '<br><small class="soluk">' + esc(m.sonuc) + '</small>' : '');
  }
  function talepDetay(id) {
    var go = function (t) {
      var h = {}, d = {}; try { h = JSON.parse(t.hasar || '{}'); d = JSON.parse(t.detay || '{}'); } catch (e) {}
      var tel = String(t.tel).replace(/\D/g, ''); if (tel.indexOf('0') === 0) tel = '9' + tel; if (tel.length === 10) tel = '90' + tel;
      var arac = t.yil + ' ' + t.marka + ' ' + t.model + (t.versiyon ? ' ' + t.versiyon : '');
      var wa = 'https://wa.me/' + tel + '?text=' + encodeURIComponent('Merhaba ' + t.ad + ', OTOKABUL\'dan yazıyoruz. ' + arac + ' aracınız için talebinizi aldık' + (t.teklif_min ? ' (ön teklif: ' + tl(t.teklif_min) + ' – ' + tl(t.teklif_max) + ' TL)' : '') + '. Ekspertiz randevusu için uygun olduğunuz zamanı yazabilir misiniz?');
      $('#cekmeceIc').innerHTML = '<div class="satirlar" style="justify-content:space-between"><h2>#' + t.id + ' · ' + esc(t.ad) + '</h2><button class="btn kucuk" id="kapat">Kapat ✕</button></div>' +
        '<div class="satirlar"><a class="btn koyu" href="tel:' + esc(t.tel) + '">📞 Ara</a><a class="btn" style="background:#25d366;color:#fff;border-color:#25d366" target="_blank" href="' + wa + '">Müşteriye WhatsApp</a><button class="btn koyu" id="dPaylas">📤 Talebi paylaş</button></div>' +
        '<dl class="bilgi"><dt>Tarih</dt><dd>' + esc(t.tarih) + '</dd><dt>Telefon</dt><dd>' + esc(t.tel) + '</dd><dt>İl</dt><dd>' + esc(t.il) + '</dd>' +
        '<dt>Araç</dt><dd>' + esc(arac) + '</dd><dt>Yakıt / vites</dt><dd>' + esc(t.yakit + ' / ' + t.vites) + (t.kasa ? ' · ' + esc(t.kasa) : '') + '</dd><dt>Kilometre</dt><dd>' + tl(t.km) + ' km</dd><dt>Renk</dt><dd>' + esc(t.renk || '—') + '</dd>' +
        '<dt>Boya / değişen</dt><dd>' + (Object.keys(h).length ? Object.keys(h).map(function (p) { return esc(PARCA_AD[p] || p) + ': ' + DURUM_AD[h[p]]; }).join('<br>') : 'Hatasız') + '</dd>' +
        '<dt>Tramer</dt><dd>' + (t.tramer ? tl(t.tramer) + ' TL' : 'Yok') + '</dd><dt>Ağır hasar</dt><dd>' + (t.agir == 1 ? '<span class="azl">VAR</span>' : 'Yok') + '</dd>' +
        (function () { var dn = []; try { dn = t.donanim ? JSON.parse(t.donanim) : []; } catch (e) {} return dn.length ? '<dt>Donanım</dt><dd>' + dn.map(esc).join('<br>') + '</dd>' : ''; })() +
        (t.aciklama ? '<dt>Müşteri açıklaması</dt><dd style="white-space:pre-wrap">' + esc(t.aciklama) + '</dd>' : '') +
        (t.kabul_tarih ? '<dt>Randevu isteği</dt><dd class="art">✓ Teklifi kabul etti · ' + esc(t.kabul_tarih) + '</dd>' : '') + '<dt>Ön teklif</dt><dd style="font-size:18px;color:var(--v2)">' + (t.teklif_min ? tl(t.teklif_min) + ' – ' + tl(t.teklif_max) + ' TL' : 'Otomatik teklif verilmedi') + '</dd></dl>' +
        '<div class="kutu"><h2>Hesap dökümü</h2><div class="kalem"><span>Baz piyasa fiyatı (motor/paket dahil)</span><b>' + tl(d.baz) + ' TL</b></div>' +
        (d.kalemler || []).map(function (x) { return '<div class="kalem"><span>' + esc(x[0]) + '</span>' + (x[1] === null ? '' : yuzde(x[1])) + '</div>'; }).join('') +
        '<div class="kalem"><span>Alım marjı ve ±aralık</span><span class="soluk">ayarlardan</span></div>' + (d.mesaj ? '<p class="soluk">' + esc(d.mesaj) + '</p>' : '') + '</div>' +
        '<div class="alanlar" style="grid-template-columns:1fr"><label>Durum<select class="girdi" id="dDurum">' + DURUMLAR.map(function (x) { return '<option' + (x === t.durum ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
        '<label>Notlar<textarea class="girdi" id="dNot" rows="4">' + esc(t.notlar || '') + '</textarea></label></div>' +
        '<div class="satirlar" style="margin-top:12px"><button class="btn ana" id="dKaydet">Kaydet</button><button class="btn kirmizi" id="dSil">Sil</button></div>';
      $('#cekmece').hidden = false;
      $('#kapat').onclick = kapat;
      $('#dPaylas').onclick = function () { paylasimAc(t, h); };
      if (+t.foto_sayi > 0) {
        var fk = document.createElement('div'); fk.className = 'kutu'; fk.innerHTML = '<h2>Fotoğraflar (' + t.foto_sayi + ')</h2><div class="talep-foto">Yükleniyor…</div>';
        var dl = $('#cekmeceIc dl.bilgi'); dl.parentNode.insertBefore(fk, dl.nextSibling);
        api('talep_fotolar', { id: t.id }).then(function (l) {
          $('.talep-foto', fk).innerHTML = l.map(function (f) { return '<a href="api.php?a=foto&id=' + f.id + '" target="_blank"><img src="api.php?a=foto&id=' + f.id + '" alt="" loading="lazy"></a>'; }).join('') || '<span class="soluk">Fotoğraf yok</span>';
        });
      }
      // müşteriye giden / planlanan otomatik WhatsApp mesajları
      (function () {
        var mk = document.createElement('div'); mk.className = 'kutu'; mk.innerHTML = '<h2>💬 Müşteriye otomatik mesajlar</h2><div class="mm-liste soluk">Yükleniyor…</div>';
        var dl2 = $('#cekmeceIc dl.bilgi'); dl2.parentNode.insertBefore(mk, dl2.nextSibling);
        var ciz = function () {
          api('talep_mesajlar', { id: t.id }).then(function (l) {
            $('.mm-liste', mk).innerHTML = l.length ? '<table class="mm-tablo">' + l.map(function (m) {
              return '<tr><td>' + esc(m.ad) + '</td><td>' + esc(String(m.zaman).slice(0, 16)) + '</td><td>' + mmDurum(m) + '</td><td>' + (m.durum === 'bekliyor' ? '<button class="btn kucuk" data-iptal="' + m.id + '">İptal</button>' : '') + '</td></tr>';
            }).join('') + '</table>' : '<span class="soluk">Bu talep için planlanmış mesaj yok.</span>';
          });
        };
        mk.onclick = function (e) { var b = e.target.closest('[data-iptal]'); if (b) api('mm_iptal', { id: +b.dataset.iptal }).then(function () { bildir('Mesaj iptal edildi'); ciz(); }); };
        ciz();
      })();
      $('#dKaydet').onclick = function () { api('talep_kaydet', { id: t.id, durum: $('#dDurum').value, notlar: $('#dNot').value }).then(function () { bildir('Kaydedildi'); kapat(); yenile(); }); };
      $('#dSil').onclick = function () { if (confirm('#' + t.id + ' numaralı talep silinsin mi?')) api('talep_sil', { id: t.id }).then(function () { bildir('Silindi'); kapat(); yenile(); }); };
    };
    var t = talepCache.find(function (x) { return +x.id === id; });
    if (t) go(t); else api('talepler', { ara: '' }).then(function (l) { talepCache = l; var x = l.find(function (y) { return +y.id === id; }); if (x) go(x); });
  }
  // ---------- TALEBİ PAYLAŞ (WhatsApp vb.) ----------
  // Varsayılan GİZLİ: ad, telefon, il ve plakalar paylaşılmaz; sadece talep no ile işaretlenir.
  var LOGO_IMG = null;
  function logoYukle() {
    if (LOGO_IMG) return Promise.resolve(LOGO_IMG);
    return new Promise(function (ok) { var i = new Image(); i.onload = function () { LOGO_IMG = i; ok(i); }; i.onerror = function () { ok(null); }; i.src = '../assets/logo-otokabul.png'; });
  }
  function resimYukle(src) { return new Promise(function (ok, red) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = red; i.src = src; }); }
  function sarKelime(c, metin, x, y, gen, sat, max) {
    var k = String(metin).split(' '), s = '', n = 0;
    for (var i = 0; i < k.length; i++) {
      var d = s ? s + ' ' + k[i] : k[i];
      if (c.measureText(d).width > gen && s) { c.fillText(s, x, y + n * sat); n++; s = k[i]; if (max && n >= max) return n; } else s = d;
    }
    if (s) { c.fillText(s, x, y + n * sat); n++; }
    return n;
  }
  function kartCiz(t, h, o) {
    return logoYukle().then(function (logo) {
      var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var c = cv.getContext('2d');
      c.fillStyle = '#f6f3ec'; c.fillRect(0, 0, W, H);
      // üst bant
      c.fillStyle = '#0f1b2d'; c.fillRect(0, 0, W, 210);
      c.fillStyle = '#ff5a1f'; c.fillRect(0, 210, W, 8);
      if (logo) { c.fillStyle = '#fff'; var lh = 96, lw = logo.width * lh / logo.height; c.beginPath(); c.roundRect(56, 56, lw + 36, lh + 24, 18); c.fill(); c.drawImage(logo, 74, 68, lw, lh); }
      c.fillStyle = '#fff'; c.textAlign = 'right'; c.font = '600 30px Inter, Arial'; c.fillText('ARAÇ BİLGİ KARTI', W - 60, 92);
      c.font = '800 54px Manrope, Arial'; c.fillStyle = '#ff7a45'; c.fillText('Talep #' + t.id, W - 60, 158);
      c.textAlign = 'left';
      var y = 290;
      c.fillStyle = '#0f1b2d'; c.font = '800 56px Manrope, Arial';
      y += sarKelime(c, t.yil + ' ' + t.marka + ' ' + t.model, 60, y, W - 120, 64, 2) * 64;
      if (t.versiyon) { c.font = '500 34px Inter, Arial'; c.fillStyle = '#475569'; y += sarKelime(c, t.versiyon, 60, y, W - 120, 42, 2) * 42; }
      y += 24;
      // bilgi kutuları
      var kutular = [['Kilometre', tl(t.km) + ' km'], ['Yakıt', t.yakit || '—'], ['Vites', t.vites || '—'], ['Kasa', t.kasa || '—'], ['Renk', t.renk || '—'], ['Tramer', t.tramer ? tl(t.tramer) + ' TL' : 'Yok']];
      var kw = (W - 120 - 2 * 24) / 3, kh = 124;
      kutular.forEach(function (b, i) {
        var x = 60 + (i % 3) * (kw + 24), yy = y + Math.floor(i / 3) * (kh + 20);
        c.fillStyle = '#fff'; c.beginPath(); c.roundRect(x, yy, kw, kh, 20); c.fill();
        c.fillStyle = '#94a3b8'; c.font = '600 24px Inter, Arial'; c.fillText(b[0].toLocaleUpperCase('tr'), x + 26, yy + 44);
        c.fillStyle = '#0f1b2d'; c.font = '800 34px Manrope, Arial'; sarKelime(c, b[1], x + 26, yy + 92, kw - 40, 36, 1);
      });
      y += 2 * (kh + 20) + 14;
      // hasar
      var ks = Object.keys(h);
      c.fillStyle = '#fff'; var hh = 96 + Math.max(1, Math.ceil(ks.length / 2)) * 44 + (+t.agir === 1 ? 50 : 0);
      c.beginPath(); c.roundRect(60, y, W - 120, hh, 20); c.fill();
      c.fillStyle = '#0f1b2d'; c.font = '800 32px Manrope, Arial'; c.fillText('Boya / değişen', 90, y + 54);
      c.font = '500 28px Inter, Arial';
      if (!ks.length) { c.fillStyle = '#16a34a'; c.fillText('✓ Hatasız, boyasız (müşteri beyanı)', 90, y + 104); }
      ks.forEach(function (p, i) {
        var x = 90 + (i % 2) * ((W - 180) / 2), yy = y + 104 + Math.floor(i / 2) * 44;
        var renk = { lokal: '#ca8a04', boyali: '#2563eb', degisen: '#dc2626' }[h[p]] || '#475569';
        c.fillStyle = renk; c.beginPath(); c.arc(x + 9, yy - 9, 9, 0, 7); c.fill();
        c.fillStyle = '#334155'; c.fillText((PARCA_AD[p] || p) + ': ' + (DURUM_AD[h[p]] || h[p]), x + 28, yy);
      });
      if (+t.agir === 1) { c.fillStyle = '#dc2626'; c.font = '700 28px Inter, Arial'; c.fillText('⚠ Ağır hasar kaydı var', 90, y + hh - 28); }
      y += hh + 24;
      // teklif / müşteri
      if (o.teklif && t.teklif_min) {
        c.fillStyle = '#fff1ea'; c.beginPath(); c.roundRect(60, y, W - 120, 118, 20); c.fill();
        c.fillStyle = '#9a3412'; c.font = '600 26px Inter, Arial'; c.fillText('ÖN TEKLİF ARALIĞI', 90, y + 46);
        c.fillStyle = '#ea580c'; c.font = '800 44px Manrope, Arial'; c.fillText(tl(t.teklif_min) + ' – ' + tl(t.teklif_max) + ' TL', 90, y + 98);
        y += 142;
      }
      if (!o.gizle) {
        c.fillStyle = '#0f1b2d'; c.beginPath(); c.roundRect(60, y, W - 120, 118, 20); c.fill();
        c.fillStyle = '#9fb0c8'; c.font = '600 26px Inter, Arial'; c.fillText('MÜŞTERİ', 90, y + 46);
        c.fillStyle = '#fff'; c.font = '700 34px Inter, Arial'; sarKelime(c, t.ad + ' · ' + t.tel + (t.il ? ' · ' + t.il : ''), 90, y + 96, W - 180, 36, 1);
        y += 142;
      }
      // alt bilgi
      c.fillStyle = '#0f1b2d'; c.fillRect(0, H - 96, W, 96);
      c.fillStyle = '#fff'; c.font = '700 30px Inter, Arial'; c.fillText('otokabul.com.tr', 60, H - 38);
      c.textAlign = 'right'; c.fillStyle = '#9fb0c8'; c.font = '500 26px Inter, Arial';
      c.fillText((o.gizle ? 'Gizli paylaşım · ' : '') + String(t.tarih || '').slice(0, 10).split('-').reverse().join('.'), W - 60, H - 38);
      c.textAlign = 'left';
      return cv;
    });
  }
  // fotoğraf: gizli modda işaretlenen plaka alanları kapatılır, köşeye talep no yazılır
  function fotoCiz(img, kutular, t, gizle) {
    var max = 1600, s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    var cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * s); cv.height = Math.round(img.naturalHeight * s);
    var c = cv.getContext('2d'); c.drawImage(img, 0, 0, cv.width, cv.height);
    if (gizle) (kutular || []).forEach(function (b) {
      var x = b.x * cv.width, y = b.y * cv.height, w = b.w * cv.width, hh = b.h * cv.height;
      c.save(); c.filter = 'blur(18px)'; c.drawImage(cv, x, y, w, hh, x, y, w, hh); c.restore();
      c.fillStyle = '#0f1b2d'; c.beginPath(); c.roundRect(x, y, w, hh, Math.min(w, hh) * 0.15); c.fill();
      c.fillStyle = '#ff5a1f'; c.font = '800 ' + Math.max(12, Math.round(hh * 0.42)) + 'px Manrope, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('OTOKABUL', x + w / 2, y + hh / 2); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    });
    var fs = Math.max(18, Math.round(cv.width * 0.028)), pad = fs * 0.6, etiket = 'OTOKABUL · Talep #' + t.id;
    c.font = '700 ' + fs + 'px Inter, Arial'; var tw = c.measureText(etiket).width;
    c.fillStyle = 'rgba(15,27,45,.78)'; c.beginPath(); c.roundRect(cv.width - tw - pad * 3, cv.height - fs - pad * 3, tw + pad * 2, fs + pad * 2, fs * 0.4); c.fill();
    c.fillStyle = '#fff'; c.fillText(etiket, cv.width - tw - pad * 2, cv.height - pad * 2 - fs * 0.12);
    return cv;
  }
  function blobAl(cv, tur) { return new Promise(function (ok) { cv.toBlob(ok, tur || 'image/jpeg', 0.9); }); }
  function paylasimAc(t, h) {
    var o = { gizle: true, teklif: false }, fotolar = [], kutular = {};
    var kap = document.createElement('div'); kap.className = 'paylas-kap';
    kap.innerHTML = '<div class="paylas-ic"><div class="satirlar" style="justify-content:space-between;margin:0 0 10px"><h2 style="margin:0">Talebi paylaş · #' + t.id + '</h2><button class="btn kucuk" data-k="kapat">Kapat ✕</button></div>' +
      '<label class="gizle-anahtar"><input type="checkbox" id="pGizle" checked><span><b>🔒 Gizle</b> — müşteri adı, telefonu, ili ve plakalar paylaşılmaz; araç yalnızca talep numarasıyla işaretlenir.</span></label>' +
      '<label class="gizle-anahtar ikincil"><input type="checkbox" id="pTeklif"><span>Ön teklif aralığını da ekle</span></label>' +
      '<div class="paylas-onizle"><canvas id="pKart"></canvas></div>' +
      '<div id="pFotoBas"></div><div class="paylas-fotolar" id="pFotolar"></div>' +
      '<div class="satirlar" style="margin-top:14px"><button class="btn ana" id="pPaylas" style="background:#25d366;border-color:#25d366">📤 WhatsApp / paylaş</button><button class="btn" id="pIndir">⬇ Görselleri indir</button><button class="btn" id="pKopya">Metni kopyala</button></div>' +
      '<p class="soluk" id="pDurum" style="margin:8px 0 0"></p></div>';
    document.body.appendChild(kap);
    var kapat2 = function () { kap.remove(); };
    kap.onclick = function (e) { if (e.target === kap || e.target.dataset.k === 'kapat') kapat2(); };
    var metin = function () {
      var a = t.yil + ' ' + t.marka + ' ' + t.model + (t.versiyon ? ' ' + t.versiyon : '');
      var hs = Object.keys(h).map(function (p) { return (PARCA_AD[p] || p) + ' ' + (DURUM_AD[h[p]] || '').toLocaleLowerCase('tr'); });
      var l = ['🚗 *OTOKABUL · Talep #' + t.id + '*', a, tl(t.km) + ' km · ' + [t.yakit, t.vites, t.kasa].filter(Boolean).join(' / ') + (t.renk ? ' · ' + t.renk : ''),
        'Boya/değişen: ' + (hs.length ? hs.join(', ') : 'yok'), 'Tramer: ' + (t.tramer ? tl(t.tramer) + ' TL' : 'yok') + (+t.agir === 1 ? ' · AĞIR HASAR KAYDI VAR' : '')];
      if (o.teklif && t.teklif_min) l.push('Ön teklif: ' + tl(t.teklif_min) + ' – ' + tl(t.teklif_max) + ' TL');
      if (!o.gizle) l.push('Müşteri: ' + t.ad + ' · ' + t.tel + (t.il ? ' · ' + t.il : ''));
      return l.join('\n');
    };
    var kartYenile = function () {
      return kartCiz(t, h, o).then(function (cv) { var hedef = $('#pKart', kap); hedef.width = cv.width; hedef.height = cv.height; hedef.getContext('2d').drawImage(cv, 0, 0); });
    };
    var fotoCizListe = function () {
      $('#pFotoBas', kap).innerHTML = fotolar.length ? '<h3 style="margin:16px 0 4px">Fotoğraflar (' + fotolar.length + ')</h3><p class="soluk" style="margin:0 0 8px">' + (o.gizle ? 'Gizli modda <b>plakanın üstünü fareyle/parmakla sürükleyerek işaretle</b>; işaretli alan bulanıklaştırılıp kapatılır. Yanlış işareti üstüne çift tıklayarak sil.' : 'Gizle kapalı: fotoğraflar olduğu gibi gönderilir.') + '</p>' : '';
      fotolar.forEach(function (f, i) {
        var el = $('#pFoto' + i, kap); if (!el) return;
        var cv = fotoCiz(f.img, kutular[i], t, o.gizle), hedef = el.querySelector('canvas');
        hedef.width = cv.width; hedef.height = cv.height; hedef.getContext('2d').drawImage(cv, 0, 0);
        el.classList.toggle('eksik', o.gizle && !(kutular[i] || []).length);
      });
    };
    $('#pGizle', kap).onchange = function (e) { o.gizle = e.target.checked; kartYenile(); fotoCizListe(); };
    $('#pTeklif', kap).onchange = function (e) { o.teklif = e.target.checked; kartYenile(); };
    kartYenile();
    if (+t.foto_sayi > 0) {
      api('talep_fotolar', { id: t.id }).then(function (l) {
        return Promise.all(l.map(function (f) { return resimYukle('api.php?a=foto&id=' + f.id).then(function (img) { return { img: img }; }).catch(function () { return null; }); }));
      }).then(function (l) {
        fotolar = l.filter(Boolean);
        $('#pFotolar', kap).innerHTML = fotolar.map(function (f, i) { return '<div class="paylas-foto" id="pFoto' + i + '"><canvas></canvas><span class="uyari">Plaka işaretlenmedi</span></div>'; }).join('');
        fotolar.forEach(function (f, i) {
          var el = $('#pFoto' + i, kap), cv = el.querySelector('canvas'), bas = null, kutu = document.createElement('div');
          kutu.className = 'secim'; el.appendChild(kutu);
          var nokta = function (e) { var r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; return { x: Math.min(1, Math.max(0, (p.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (p.clientY - r.top) / r.height)) }; };
          var ciz = function (a, b) { var r = cv.getBoundingClientRect(), er = el.getBoundingClientRect(); kutu.style.cssText = 'display:block;left:' + (r.left - er.left + Math.min(a.x, b.x) * r.width) + 'px;top:' + (r.top - er.top + Math.min(a.y, b.y) * r.height) + 'px;width:' + Math.abs(b.x - a.x) * r.width + 'px;height:' + Math.abs(b.y - a.y) * r.height + 'px'; };
          var basla = function (e) { if (!o.gizle) return; e.preventDefault(); bas = nokta(e); ciz(bas, bas); };
          var hareket = function (e) { if (bas) { e.preventDefault(); ciz(bas, nokta(e)); } };
          var bitir = function (e) {
            if (!bas) return; var son = e.changedTouches ? (function () { var r = cv.getBoundingClientRect(), p = e.changedTouches[0]; return { x: Math.min(1, Math.max(0, (p.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (p.clientY - r.top) / r.height)) }; })() : nokta(e);
            var b = { x: Math.min(bas.x, son.x), y: Math.min(bas.y, son.y), w: Math.abs(son.x - bas.x), h: Math.abs(son.y - bas.y) };
            bas = null; kutu.style.display = 'none';
            if (b.w > 0.02 && b.h > 0.01) { (kutular[i] = kutular[i] || []).push(b); fotoCizListe(); }
          };
          cv.addEventListener('mousedown', basla); window.addEventListener('mousemove', hareket); window.addEventListener('mouseup', bitir);
          cv.addEventListener('touchstart', basla, { passive: false }); cv.addEventListener('touchmove', hareket, { passive: false }); cv.addEventListener('touchend', bitir);
          cv.addEventListener('dblclick', function (e) {
            var p = nokta(e), l = kutular[i] || [];
            for (var j = l.length - 1; j >= 0; j--) if (p.x >= l[j].x && p.x <= l[j].x + l[j].w && p.y >= l[j].y && p.y <= l[j].y + l[j].h) { l.splice(j, 1); fotoCizListe(); return; }
          });
        });
        fotoCizListe();
      });
    }
    var dosyalar = function () {
      return kartCiz(t, h, o).then(function (kart) {
        return Promise.all([blobAl(kart, 'image/png')].concat(fotolar.map(function (f, i) { return blobAl(fotoCiz(f.img, kutular[i], t, o.gizle)); })));
      }).then(function (bl) {
        return bl.map(function (b, i) { return new File([b], 'otokabul-talep-' + t.id + (i ? '-foto' + i + '.jpg' : '-kart.png'), { type: b.type }); });
      });
    };
    var eksikVar = function () {
      if (!o.gizle) return false;
      var n = fotolar.filter(function (f, i) { return !(kutular[i] || []).length; }).length;
      return n && !confirm(n + ' fotoğrafta plaka işaretlenmedi. Bu fotoğraflar plakasıyla gidebilir. Yine de devam edilsin mi?');
    };
    var durum = function (m) { $('#pDurum', kap).textContent = m; };
    $('#pPaylas', kap).onclick = function () {
      if (eksikVar()) return;
      durum('Hazırlanıyor…');
      dosyalar().then(function (fl) {
        if (navigator.canShare && navigator.canShare({ files: fl })) {
          return navigator.share({ files: fl, text: metin(), title: 'OTOKABUL Talep #' + t.id }).then(function () { durum('Paylaşıldı ✓'); }).catch(function () { durum(''); });
        }
        // paylaşım penceresi yoksa: görselleri indir + WhatsApp'ı metinle aç
        fl.forEach(function (f) { var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); });
        window.open('https://wa.me/?text=' + encodeURIComponent(metin()), '_blank');
        durum('Görseller indirildi; WhatsApp açıldı. Sohbeti seçip indirilen görselleri sürükleyerek ekle.');
      });
    };
    $('#pIndir', kap).onclick = function () {
      if (eksikVar()) return;
      dosyalar().then(function (fl) { fl.forEach(function (f) { var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); }); durum(fl.length + ' görsel indirildi'); });
    };
    $('#pKopya', kap).onclick = function () { navigator.clipboard.writeText(metin()).then(function () { durum('Metin kopyalandı'); }); };
  }
  function kapat() { $('#cekmece').hidden = true; }
  $('#cekmece').onclick = function (e) { if (e.target.id === 'cekmece') kapat(); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') kapat(); });
  function yenile() { var a = $('#menu a.aktif'); if (a) sayfa(a.dataset.s); rozetGuncelle(); }

  // ---------- FİYAT TABLOSU ----------
  var fFiltre = { markalar: [], model: '', yil1: '', yil2: '', durum: '', ara: '', sira: 'marka', limit: 500 };
  function markaSecenek(secili) { return '<option value="">Tüm markalar</option>' + markaListesi.map(function (m) { return '<option' + (m === secili ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join(''); }
  function cizFiyatlar(k) {
    k.innerHTML = '<h1 class="bas">Fiyat Tablosu</h1><p class="bas-alt">Her satır bir marka/model/yıl. <b>Piyasa</b> robotun bulduğu ilan medyanı; <b>Ayar %</b> ile oynayın ya da <b>Elle Fiyat</b> yazın. Hücreden çıkınca kaydedilir.</p>' +
      '<div class="satirlar">' +
      '<select class="girdi" id="fMarka">' + markaSecenek(fFiltre.markalar[0]) + '</select>' +
      '<input class="girdi" id="fModel" placeholder="Model" style="width:120px" value="' + esc(fFiltre.model) + '">' +
      '<input class="girdi" id="fYil1" placeholder="Yıl ≥" style="width:80px" value="' + esc(fFiltre.yil1) + '"><input class="girdi" id="fYil2" placeholder="Yıl ≤" style="width:80px" value="' + esc(fFiltre.yil2) + '">' +
      '<select class="girdi" id="fDurum"><option value="">Tüm satırlar</option><option value="ayarli">Ayarlı (% ≠ 0)</option><option value="elle">Elle fiyatlı</option><option value="kilit">Kilitli</option><option value="pasif">Pasif</option><option value="az">Az ilanlı (&lt;5)</option><option value="kasko">Kaskodan (ilansız)</option><option value="ilan">İlandan</option></select>' +
      '<select class="girdi" id="fSira"><option value="marka">Sıra: Marka/Model</option><option value="yil">Sıra: Yıl</option><option value="piyasa">Sıra: Fiyat</option><option value="adet">Sıra: İlan sayısı</option><option value="degisim">Sıra: En çok değişen</option></select>' +
      '<button class="btn koyu" id="fToplu">⚡ Bu filtreye toplu değişim</button><button class="btn" id="fEkle">+ Satır ekle</button><button class="btn" id="fCsv">CSV</button></div>' +
      '<div class="tablo-kap" id="fTablo">Yükleniyor…</div><div class="alt-not" id="fNot"></div>';
    $('#fDurum', k).value = fFiltre.durum; $('#fSira', k).value = fFiltre.sira;
    var zaman, oku = function () {
      fFiltre.markalar = $('#fMarka', k).value ? [$('#fMarka', k).value] : [];
      fFiltre.model = $('#fModel', k).value.trim(); fFiltre.yil1 = $('#fYil1', k).value.trim(); fFiltre.yil2 = $('#fYil2', k).value.trim();
      fFiltre.durum = $('#fDurum', k).value; fFiltre.sira = $('#fSira', k).value;
      clearTimeout(zaman); zaman = setTimeout(function () { fiyatYukle(k); }, 250);
    };
    $$('.satirlar .girdi', k).forEach(function (i) { i.oninput = oku; i.onchange = oku; });
    $('#fToplu', k).onclick = function () { sayfa('toplu', JSON.parse(JSON.stringify(fFiltre))); };
    $('#fEkle', k).onclick = satirEkleFormu;
    $('#fCsv', k).onclick = function () {
      api('fiyatlar', Object.assign({}, fFiltre, { limit: 2000 })).then(function (j) {
        csvIndir('fiyat_tablosu.csv', [['Marka', 'Model', 'Yıl', 'İlan', 'Piyasa', 'P25', 'P75', 'Ayar %', 'Elle', 'Baz', 'Alım teklifi', 'Kilit', 'Aktif']].concat(j.satirlar.map(function (r) { return [r.marka, r.model, r.yil, r.adet, r.piyasa, r.p25, r.p75, String(r.ayar).replace('.', ','), r.elle || '', r.baz, r.teklif, r.kilit ? 'E' : '', r.aktif ? 'E' : 'H']; })));
      });
    };
    if (!markaListesi.length) api('markalar').then(function (l) { markaListesi = l; $('#fMarka', k).innerHTML = markaSecenek(fFiltre.markalar[0]); });
    fiyatYukle(k);
  }
  function satirHtml(r, i) {
    var deg = r.onceki > 0 ? (r.piyasa / r.onceki - 1) * 100 : 0;
    return '<tr data-id="' + r.id + '" class="' + (r.aktif == 1 ? '' : 'pasif') + '"><td class="sat-no">' + (i + 1) + '</td><td>' + esc(r.marka) + '</td><td>' + esc(r.model) + '</td><td>' + r.yil + '</td>' +
      '<td class="s">' + (r.kaynak === 'kasko' ? '<span class="rozet" title="İlan yok: kasko × katsayı">kasko</span>' : (r.adet || '—')) + '</td><td class="s">' + tl(r.piyasa) + '</td><td class="s">' + (r.onceki > 0 && Math.abs(deg) >= 0.05 ? yuzde(Math.round(deg * 10) / 10) : '') + '</td>' +
      '<td class="s soluk">' + (r.p25 ? tl(r.p25) + ' – ' + tl(r.p75) : '') + '</td>' +
      '<td><input class="hucre' + (+r.ayar ? ' dolu' : '') + '" data-alan="ayar" value="' + (+r.ayar ? String(+r.ayar).replace('.', ',') : '') + '" placeholder="0" style="width:64px"></td>' +
      '<td><input class="hucre' + (r.elle ? ' dolu' : '') + '" data-alan="elle" value="' + (r.elle ? NF.format(r.elle) : '') + '" placeholder="—"></td>' +
      '<td class="s baz">' + tl(r.baz) + '</td><td class="s teklif">' + tl(r.teklif) + '</td>' +
      '<td style="text-align:center"><input type="checkbox" data-alan="kilit"' + (r.kilit == 1 ? ' checked' : '') + ' title="Kilitli satırın piyasa fiyatını robot değiştirmez"></td>' +
      '<td style="text-align:center"><input type="checkbox" data-alan="aktif"' + (r.aktif == 1 ? ' checked' : '') + ' title="Pasif satır sitede görünmez"></td></tr>';
  }
  function fiyatYukle(k) {
    api('fiyatlar', fFiltre).then(function (j) {
      $('#fTablo', k).innerHTML = '<table class="xl"><thead><tr><th></th><th>Marka</th><th>Model</th><th>Yıl</th><th>İlan</th><th>Piyasa</th><th>Son değişim</th><th>Piyasa aralığı</th><th>Ayar %</th><th>Elle fiyat</th><th>Baz fiyat</th><th>Alım teklifi (−' + j.marj + '%)</th><th>Kilit</th><th>Aktif</th></tr></thead><tbody>' +
        j.satirlar.map(satirHtml).join('') + '</tbody></table>';
      $('#fNot', k).innerHTML = NF.format(j.toplam) + ' satır' + (j.toplam > j.satirlar.length ? ' · ilk ' + j.satirlar.length + ' gösteriliyor, filtreyi daraltın' : '') + ' · Baz = Elle fiyat varsa o, yoksa Piyasa × (1 + Ayar%). Alım teklifi km/hasar düzeltmesinden önceki ortalamadır.';
      var tb = $('tbody', k);
      tb.addEventListener('change', function (e) {
        var el = e.target, tr = el.closest('tr'); if (!el.dataset.alan) return;
        var deger = el.type === 'checkbox' ? el.checked : el.value.replace(/\./g, '').replace(',', '.').trim();
        if (el.dataset.alan === 'elle') deger = el.value.replace(/\D/g, '');
        api('satir_kaydet', { id: +tr.dataset.id, alan: el.dataset.alan, deger: deger }).then(function (s) {
          var idx = +$('.sat-no', tr).textContent - 1;
          var t = document.createElement('tbody'); t.innerHTML = satirHtml(s.satir, idx);
          var yeni = t.firstChild; tr.replaceWith(yeni); yeni.classList.add('kaydedildi');
        });
      });
      tb.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        var el = e.target; if (!el.classList.contains('hucre')) return;
        e.preventDefault();
        var tr = el.closest('tr'), hedef = (e.key === 'ArrowUp' ? tr.previousElementSibling : tr.nextElementSibling);
        el.blur();
        if (hedef) { var x = hedef.querySelector('[data-alan="' + el.dataset.alan + '"]'); if (x) { x.focus(); x.select(); } }
      });
    });
  }
  function satirEkleFormu() {
    $('#cekmeceIc').innerHTML = '<div class="satirlar" style="justify-content:space-between"><h2>Satır ekle / elle fiyat</h2><button class="btn kucuk" id="kapat">Kapat ✕</button></div>' +
      '<p class="soluk">Robotta olmayan bir araç için fiyat girin. Aynı marka/model/yıl varsa elle fiyatı güncellenir. Satır kilitli eklenir.</p>' +
      '<div class="alanlar" style="grid-template-columns:1fr"><label>Marka<input class="girdi" id="eMarka" list="eMarkalar"></label><datalist id="eMarkalar">' + markaListesi.map(function (m) { return '<option value="' + esc(m) + '">'; }).join('') + '</datalist>' +
      '<label>Model<input class="girdi" id="eModel"></label><label>Yıl<input class="girdi" id="eYil" inputmode="numeric"></label><label>Piyasa fiyatı (TL)<input class="girdi" id="eFiyat" inputmode="numeric"></label></div>' +
      '<div class="satirlar" style="margin-top:12px"><button class="btn ana" id="eKaydet">Kaydet</button></div>';
    $('#cekmece').hidden = false; $('#kapat').onclick = kapat;
    $('#eKaydet').onclick = function () {
      api('satir_ekle', { marka: $('#eMarka').value, model: $('#eModel').value, yil: $('#eYil').value, fiyat: $('#eFiyat').value.replace(/\D/g, '') })
        .then(function () { bildir('Kaydedildi'); kapat(); api('markalar').then(function (l) { markaListesi = l; }); yenile(); });
    };
  }

  // ---------- TOPLU DEĞİŞİM ----------
  var tFiltre = { markalar: [], model: '', yil1: '', yil2: '', fiyat1: '', fiyat2: '', durum: '' };
  function cizToplu(k, gelenFiltre) {
    if (gelenFiltre) tFiltre = Object.assign({ fiyat1: '', fiyat2: '' }, gelenFiltre);
    k.innerHTML = '<h1 class="bas">Toplu Fiyat Değişimi</h1><p class="bas-alt">Talimatınızı verin, filtreye uyan tüm araçların fiyatı aynı anda değişsin. Her işlem kaydedilir ve tek tıkla geri alınabilir.</p>' +
      '<div class="iki-kolon"><div class="kutu"><h2>1. Hangi araçlar?</h2>' +
      '<label style="font-size:12.5px;font-weight:600">Markalar <small class="soluk">(hiçbiri seçili değilse tümü)</small></label>' +
      '<div class="satirlar" style="margin:6px 0"><input class="girdi" id="mAra" placeholder="Marka ara…" style="width:160px"><button class="btn kucuk" id="mTum">Tümünü seç</button><button class="btn kucuk" id="mHic">Temizle</button></div>' +
      '<div class="markalar-sec" id="mListe"></div>' +
      '<div class="alanlar" style="margin-top:12px"><label>Model içerir<input class="girdi" id="tModel" value="' + esc(tFiltre.model) + '"></label>' +
      '<label>Yıl (en az – en çok)<span class="satirlar" style="margin:0"><input class="girdi" id="tYil1" style="width:48%" value="' + esc(tFiltre.yil1) + '"><input class="girdi" id="tYil2" style="width:48%" value="' + esc(tFiltre.yil2) + '"></span></label>' +
      '<label>Baz fiyat (en az – en çok TL)<span class="satirlar" style="margin:0"><input class="girdi" id="tF1" style="width:48%" value="' + esc(tFiltre.fiyat1) + '"><input class="girdi" id="tF2" style="width:48%" value="' + esc(tFiltre.fiyat2) + '"></span></label>' +
      '<label>Satır durumu<select class="girdi" id="tDurum"><option value="">Hepsi</option><option value="ayarli">Ayarlı olanlar</option><option value="elle">Elle fiyatlılar</option><option value="kilit">Kilitliler</option><option value="az">Az ilanlılar</option><option value="kasko">Kaskodan (ilansız)</option><option value="ilan">İlandan</option></select></label></div></div>' +
      '<div class="kutu"><h2>2. Ne yapılsın?</h2>' +
      '<div class="alanlar" style="grid-template-columns:1fr 1fr"><label>İşlem<select class="girdi" id="tTip"><option value="yuzde">Yüzde değiştir (%)</option><option value="sabit">Tutar ekle / çıkar (TL)</option><option value="sifirla">Ayarları sıfırla (piyasaya dön)</option></select></label>' +
      '<label>Değer <small>(azaltmak için eksi yazın)</small><input class="girdi" id="tOran" placeholder="ör. 3 veya -2,5"></label></div>' +
      '<div id="hizli" style="margin:10px 0">' + [[-15, -1], [1, 15]].map(function (a) { var b = []; for (var i = a[0]; i <= a[1]; i++) b.push('<button class="btn kucuk ' + (i < 0 ? 'eksi' : 'arti') + '" data-v="' + i + '">' + (i > 0 ? '+' : '') + i + '%</button>'); return '<div class="hizli">' + b.join('') + '</div>'; }).join('') + '</div>' +
      '<div class="alanlar" style="grid-template-columns:1fr 1fr"><label>Uygulanacak satırlar<select class="girdi" id="tHedef"><option value="hepsi">Hepsi</option><option value="robot">Sadece robot fiyatlı</option><option value="elle">Sadece elle fiyatlı</option></select></label>' +
      '<label>Açıklama <small>(isteğe bağlı)</small><input class="girdi" id="tAcik" placeholder="ör. Kasım zammı"></label></div>' +
      '<div class="satirlar" style="margin-top:14px"><button class="btn" id="tOnizle">Önizle</button><button class="btn ana" id="tUygula">Uygula</button></div>' +
      '<div id="tSonuc"></div></div></div>' +
      '<div class="kutu"><h2>İşlem geçmişi</h2><div id="tGecmis">Yükleniyor…</div></div>';
    var secili = {}; tFiltre.markalar.forEach(function (m) { secili[m] = 1; });
    var mCiz = function () {
      var q = $('#mAra', k).value.toLocaleLowerCase('tr');
      $('#mListe', k).innerHTML = markaListesi.filter(function (m) { return !q || m.toLocaleLowerCase('tr').indexOf(q) >= 0; })
        .map(function (m) { return '<label><input type="checkbox" value="' + esc(m) + '"' + (secili[m] ? ' checked' : '') + ' hidden>' + esc(m) + '</label>'; }).join('');
    };
    var onZaman, gecersiz = function () { $('#tSonuc', k).innerHTML = ''; clearTimeout(onZaman); onZaman = setTimeout(function () { if ($('#tOran', k).value.trim() || $('#tTip', k).value === 'sifirla') onizle(); }, 450); };
    if (!markaListesi.length) api('markalar').then(function (l) { markaListesi = l; mCiz(); }); else mCiz();
    $('#mAra', k).oninput = mCiz;
    $('#mListe', k).onchange = function (e) { if (e.target.checked) secili[e.target.value] = 1; else delete secili[e.target.value]; gecersiz(); };
    $('#mTum', k).onclick = function () { $$('#mListe input', k).forEach(function (i) { secili[i.value] = 1; }); mCiz(); gecersiz(); };
    $('#mHic', k).onclick = function () { secili = {}; mCiz(); gecersiz(); };
    $('#tDurum', k).value = tFiltre.durum || '';
    $$('.girdi', k).forEach(function (i) { if (i.id !== 'mAra') i.addEventListener('input', gecersiz); });
    $('#tTip', k).onchange = function () { $('#tOran', k).disabled = this.value === 'sifirla'; $('#hizli', k).style.display = this.value === 'yuzde' ? '' : 'none'; gecersiz(); };
    $('#hizli', k).onclick = function (e) { var b = e.target.closest('button'); if (b) { $('#tOran', k).value = b.dataset.v; $$('#hizli button', k).forEach(function (x) { x.classList.toggle('secili', x === b); }); clearTimeout(onZaman); onizle(); } };
    var istek = function () {
      return {
        filtre: { markalar: Object.keys(secili), model: $('#tModel', k).value.trim(), yil1: $('#tYil1', k).value.trim(), yil2: $('#tYil2', k).value.trim(), fiyat1: $('#tF1', k).value.replace(/\D/g, ''), fiyat2: $('#tF2', k).value.replace(/\D/g, ''), durum: $('#tDurum', k).value },
        tip: $('#tTip', k).value, oran: $('#tOran', k).value.replace(/\./g, '').replace(',', '.').trim(), hedef: $('#tHedef', k).value, aciklama: $('#tAcik', k).value.trim()
      };
    };
    var onizle = function () {
      var g = istek();
      return api('toplu_onizle', g).then(function (o) {
        $('#tSonuc', k).innerHTML = '<p style="margin:12px 0 6px"><b>' + NF.format(o.adet) + '</b> satır etkilenecek · ortalama değişim ' + yuzde(o.ort_degisim) + '</p>' +
          (o.ornek.length ? '<div class="tablo-kap" style="max-height:260px"><table class="xl"><tr><th>Araç</th><th>Şimdiki baz</th><th>Yeni baz</th></tr>' + o.ornek.map(function (x) { return '<tr><td>' + esc(x.yil + ' ' + x.marka + ' ' + x.model) + '</td><td class="s">' + tl(x.eski) + '</td><td class="s baz">' + tl(x.yeni) + '</td></tr>'; }).join('') + '</table></div>' + (o.adet > o.ornek.length ? '<div class="alt-not">İlk ' + o.ornek.length + ' örnek gösteriliyor.</div>' : '') : '');
        return o;
      }).catch(function () { $('#tSonuc', k).innerHTML = ''; });
    };
    $('#tOnizle', k).onclick = onizle;
    $('#tUygula', k).onclick = function () {
      var g = istek(), b = this;
      clearTimeout(onZaman); b.disabled = true;
      onizle().then(function (o) {
        b.disabled = false;
        if (!o) return;
        if (!o.adet) return bildir('Filtreye uyan satır yok.', true);
        var ne = g.tip === 'sifirla' ? 'ayarları sıfırlanacak' : 'fiyatı ' + (g.tip === 'yuzde' ? (+g.oran > 0 ? '+' : '') + g.oran + '%' : NF.format(+g.oran) + ' TL') + ' değişecek';
        if (!confirm(NF.format(o.adet) + ' satırın ' + ne + '. Onaylıyor musunuz?\n(İşlem geçmişinden geri alınabilir)')) return;
        return api('toplu_uygula', g).then(function (r) { bildir(NF.format(r.adet) + ' satır güncellendi'); $('#tSonuc', k).innerHTML = '<p class="art" style="margin-top:12px">✓ ' + NF.format(r.adet) + ' satır güncellendi.</p>'; gecmisCiz(); });
      }, function () { b.disabled = false; });
    };
    var gecmisCiz = function () {
      api('islemler').then(function (l) {
        $('#tGecmis', k).innerHTML = l.length ? '<div class="tablo-kap" style="max-height:340px"><table class="xl"><tr><th>Tarih</th><th>İşlem</th><th>Satır</th><th></th></tr>' + l.map(function (i) {
          return '<tr><td>' + esc(i.tarih) + '</td><td>' + esc(i.aciklama) + '</td><td class="s">' + NF.format(i.etkilenen) + '</td><td>' + (i.geri_alindi == 1 ? '<span class="rozet">geri alındı</span>' : '<button class="btn kucuk" data-geri="' + i.id + '">↶ Geri al</button>') + '</td></tr>';
        }).join('') + '</table></div><div class="alt-not">Geri alma, o işlemden önceki değerlere döndürür. Sonraki işlemleri etkileyebileceği için en yeniden eskiye doğru geri almanız önerilir.</div>' : '<p class="soluk">Henüz işlem yok.</p>';
        $$('[data-geri]', k).forEach(function (b) { b.onclick = function () { if (confirm('Bu işlem geri alınsın mı?')) api('geri_al', { id: +b.dataset.geri }).then(function () { bildir('Geri alındı'); gecmisCiz(); }); }; });
      });
    };
    gecmisCiz();
  }

  // ---------- FİYAT ROBOTU ----------
  var robotSonuc = null, robotCalisiyor = false;
  function cizRobot(k) {
    k.innerHTML = '<h1 class="bas">Fiyat Robotu</h1><p class="bas-alt">AraçRadar\'ın topladığı arabam.com ve sahibinden ilanlarını okur, her marka/model/yıl için uç değerleri atıp piyasa medyanını çıkarır. Kaydettiğinizde tüm teklifler yeni piyasaya göre güncellenir (Ayar % ve elle fiyatlar korunur).</p>' +
      '<div class="iki-kolon"><div class="kutu"><h2>Piyasayı tara</h2>' +
      '<div class="alanlar" style="grid-template-columns:1fr"><label>Veri kaynağı (AraçRadar meta.json)<input class="girdi" id="rUrl"></label>' +
      '<label>En az ilan sayısı <small>(bundan az ilanı olan yıl satırı oluşturulmaz)</small><input class="girdi" id="rMin" style="width:90px"></label></div>' +
      '<div class="satirlar" style="margin-top:12px"><button class="btn ana" id="rTara">🤖 Piyasayı Tara</button><label class="btn" style="font-weight:500">📁 Dosyadan (JSON)<input type="file" id="rDosya" accept=".json" multiple hidden></label></div>' +
      '<div class="ilerleme"><i id="rCubuk"></i></div><div class="log" id="rLog">Hazır.</div></div>' +
      '<div class="kutu" id="rSonuc"><h2>Sonuç</h2><p class="soluk">Tarama yapıldığında burada piyasa değişim analizi görünecek.</p></div></div>' +
      '<div class="iki-kolon"><div class="kutu"><h2>Excel\'den fiyat listesi yapıştır</h2><p class="soluk" style="margin-top:0">Sütunlar: <b>Marka · Model · Yıl · Fiyat</b> (Excel\'den kopyalayıp yapıştırın). Kasko değer listesi veya kendi listeniz için.</p>' +
      '<textarea class="girdi" id="lMetin" rows="6" style="width:100%" placeholder="Renault\tClio\t2020\t1035000"></textarea>' +
      '<div class="satirlar" style="margin-top:8px"><select class="girdi" id="lMod"><option value="elle">Elle fiyat olarak yaz (robot ezmez)</option><option value="piyasa">Piyasa fiyatı olarak yaz</option></select><button class="btn koyu" id="lAktar">İçe aktar</button></div></div>' +
      '<div class="kutu"><h2>Tarama geçmişi</h2><div id="rGecmis">Yükleniyor…</div></div></div>';
    api('ayarlar').then(function (A) { $('#rUrl', k).value = A.robot_url; $('#rMin', k).value = A.robot_min_adet; });
    $('#rTara', k).onclick = function () { robotTara($('#rUrl', k).value.trim(), +$('#rMin', k).value || 3, false); };
    $('#rDosya', k).onchange = function () {
      var dosyalar = Array.prototype.slice.call(this.files); if (!dosyalar.length) return;
      Promise.all(dosyalar.map(function (f) { return f.text().then(JSON.parse); })).then(function (l) {
        var kayit = []; l.forEach(function (x) { kayit = kayit.concat(Array.isArray(x) ? x : (x.ilanlar || [])); });
        robotIsle(kayit, +$('#rMin', k).value || 3, dosyalar.map(function (f) { return f.name; }).join(', '), false);
      }).catch(function (e) { bildir('Dosya okunamadı: ' + e.message, true); });
    };
    $('#lAktar', k).onclick = function () {
      var sat = $('#lMetin', k).value.split(/\r?\n/).map(function (s) { return s.split(/\t|;/).map(function (h) { return h.trim(); }); }).filter(function (s) { return s.length >= 4 && +s[2]; });
      if (!sat.length) return bildir('Okunabilir satır yok. Sütunlar: Marka, Model, Yıl, Fiyat', true);
      api('liste_ice_aktar', { satirlar: sat, mod: $('#lMod', k).value }).then(function (r) { bildir(r.adet + ' satır içe aktarıldı'); $('#lMetin', k).value = ''; });
    };
    if (robotSonuc) sonucCiz(robotSonuc);
    gecmisCizRobot();
  }
  function gecmisCizRobot() {
    var g = $('#rGecmis'); if (!g) return;
    api('robot_log').then(function (l) {
      g.innerHTML = l.length ? '<div class="tablo-kap" style="max-height:300px"><table class="xl"><tr><th>Tarih</th><th>Kaynak</th><th>İlan</th><th>Satır</th><th>Yeni</th><th>Piyasa</th></tr>' + l.map(function (r) { return '<tr><td>' + esc(r.tarih) + '</td><td>' + esc(String(r.kaynak).slice(0, 40)) + '</td><td class="s">' + NF.format(r.cozulen) + '</td><td class="s">' + NF.format(r.satir) + '</td><td class="s">' + NF.format(r.yeni) + '</td><td class="s">' + (r.degisim ? yuzde(r.degisim) : '—') + '</td></tr>'; }).join('') + '</table></div>' : '<p class="soluk">Henüz tarama yok.</p>';
    });
  }
  function rlog(m) { var l = $('#rLog'); if (l) { l.textContent += '\n' + m; l.scrollTop = 1e9; } }
  function robotTara(url, minAdet, otomatik) {
    if (robotCalisiyor) return; robotCalisiyor = true;
    var l = $('#rLog'); if (l) l.textContent = 'Kaynak okunuyor: ' + url;
    var b = $('#rTara'); if (b) b.disabled = true;
    var bitti = function () { robotCalisiyor = false; var b = $('#rTara'); if (b) b.disabled = false; };
    fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now()).then(function (r) { if (!r.ok) throw new Error('meta.json okunamadı (' + r.status + ')'); return r.json(); }).then(function (meta) {
      var taban = url.replace(/[^/]*$/, '').replace(/data\/$/, '');
      var parcalar = (meta.parcalar || []).map(function (p) { return /^https?:/.test(p) ? p : taban + p; });
      if (!parcalar.length) throw new Error('meta.json içinde parça listesi yok');
      rlog(parcalar.length + ' parça, toplam ' + NF.format(meta.toplam || 0) + ' ilan. İndiriliyor…');
      var kayit = [], i = 0;
      var sirayla = function () {
        if (i >= parcalar.length) return Promise.resolve();
        var u = parcalar[i];
        return fetch(u + '?t=' + Date.now()).then(function (r) { if (!r.ok) throw new Error(u + ' → ' + r.status); return r.json(); }).then(function (j) {
          kayit = kayit.concat(Array.isArray(j) ? j : (j.ilanlar || []));
          i++; var c = $('#rCubuk'); if (c) c.style.width = (i / parcalar.length * 80) + '%';
          if (i % 5 === 0 || i === parcalar.length) rlog(i + '/' + parcalar.length + ' parça · ' + NF.format(kayit.length) + ' ilan');
          return sirayla();
        });
      };
      return sirayla().then(function () { return robotIsle(kayit, minAdet, 'AraçRadar (' + url.replace(/^https?:\/\//, '').slice(0, 60) + ')', otomatik); });
    }).catch(function (e) { rlog('HATA: ' + e.message); bildir('Robot: ' + e.message, true); }).then(bitti, bitti);
  }
  function robotIsle(kayit, minAdet, kaynak, otomatik) {
    rlog('Ayrıştırılıyor ve piyasa medyanları hesaplanıyor…');
    var a = RobotCore.aggregate(kayit, { minAdet: minAdet });
    a.kaynak = kaynak;
    rlog(NF.format(a.cozulen) + ' / ' + NF.format(a.toplamKayit) + ' ilan çözüldü → ' + NF.format(a.satirlar.length) + ' fiyat satırı.');
    var c = $('#rCubuk'); if (c) c.style.width = '90%';
    return api('piyasa_tumu').then(function (mevcut) {
      var oranlar = [], marka = {}, yeni = 0, hareket = [];
      a.satirlar.forEach(function (s) {
        var m = mevcut[s.marka + '|' + s.model + '|' + s.yil];
        if (!m) { yeni++; return; }
        if (m[1] || !m[0]) return;
        var o = s.medyan / m[0] - 1; if (Math.abs(o) >= 1) return;
        oranlar.push(o); (marka[s.marka] = marka[s.marka] || []).push(o);
        hareket.push({ s: s, eski: m[0], o: o });
      });
      var med = function (x) { if (!x.length) return 0; x = x.slice().sort(function (p, q) { return p - q; }); var n = x.length; return n % 2 ? x[(n - 1) / 2] : (x[n / 2 - 1] + x[n / 2]) / 2; };
      a.analiz = {
        genel: Math.round(med(oranlar) * 10000) / 100, karsilastirilan: oranlar.length, yeni: yeni,
        marka: Object.keys(marka).filter(function (m) { return marka[m].length >= 3; }).map(function (m) { return { m: m, o: Math.round(med(marka[m]) * 10000) / 100, n: marka[m].length }; }).sort(function (p, q) { return q.n - p.n; }),
        hareket: hareket.filter(function (h) { return h.s.adet >= 5 && Math.abs(h.o) >= 0.005; }).sort(function (p, q) { return Math.abs(q.o) - Math.abs(p.o); }).slice(0, 25)
      };
      robotSonuc = a;
      if (c) c.style.width = '100%';
      rlog('Analiz hazır: genel piyasa değişimi ' + a.analiz.genel + '%');
      if (otomatik) {
        if (Math.abs(a.analiz.genel) > 15) { bildir('Otomatik robot: piyasa değişimi ' + a.analiz.genel + '% — çok yüksek, kaydetmedim. Fiyat Robotu sayfasından kontrol edin.', true); return; }
        return robotKaydet(true);
      }
      sonucCiz(a);
    });
  }
  function sonucCiz(a) {
    var k = $('#rSonuc'); if (!k) return;
    var an = a.analiz;
    k.innerHTML = '<h2>Sonuç</h2><div class="kartlar"><div class="kart"><div class="s">Genel piyasa değişimi</div><div class="buyuk-rakam">' + yuzde(an.genel) + '</div><div class="s">' + NF.format(an.karsilastirilan) + ' satır karşılaştırıldı (medyan)</div></div>' +
      '<div class="kart"><div class="s">Fiyat satırı</div><div class="d">' + NF.format(a.satirlar.length) + '</div><div class="s">' + NF.format(an.yeni) + ' yeni satır</div></div></div>' +
      '<div class="satirlar"><button class="btn ana" id="rKaydet">✓ Veritabanına kaydet</button><span class="soluk">Kaydedince tüm teklifler bu piyasaya göre hesaplanır.</span></div>' +
      (an.marka.length ? '<div class="tablo-kap" style="max-height:240px;margin-top:10px"><table class="xl"><tr><th>Marka</th><th>Satır</th><th>Değişim (medyan)</th></tr>' + an.marka.map(function (m) { return '<tr><td>' + esc(m.m) + '</td><td class="s">' + m.n + '</td><td class="s">' + yuzde(m.o) + '</td></tr>'; }).join('') + '</table></div>' : '') +
      (an.hareket.length ? '<h2 style="margin-top:14px">En çok değişenler (5+ ilan)</h2><div class="tablo-kap" style="max-height:240px"><table class="xl"><tr><th>Araç</th><th>Eski</th><th>Yeni</th><th>%</th></tr>' + an.hareket.map(function (h) { return '<tr><td>' + esc(h.s.yil + ' ' + h.s.marka + ' ' + h.s.model) + ' <span class="soluk">(' + h.s.adet + ')</span></td><td class="s">' + tl(h.eski) + '</td><td class="s">' + tl(h.s.medyan) + '</td><td class="s">' + yuzde(Math.round(h.o * 1000) / 10) + '</td></tr>'; }).join('') + '</table></div>' : '');
    $('#rKaydet').onclick = function () { robotKaydet(false); };
  }
  function robotKaydet(otomatik) {
    var a = robotSonuc; if (!a) return;
    var b = $('#rKaydet'); if (b) b.disabled = true;
    return api('robot_kaydet', { satirlar: a.satirlar, versiyonlar: a.versiyonlar, toplamKayit: a.toplamKayit, cozulen: a.cozulen, kaynak: (otomatik ? 'Otomatik · ' : '') + a.kaynak }).then(function (r) {
      bildir((otomatik ? 'Otomatik robot: ' : '') + NF.format(r.guncellenen) + ' satır güncellendi, ' + NF.format(r.yeni) + ' yeni satır · piyasa ' + (r.genel_degisim > 0 ? '+' : '') + r.genel_degisim + '%');
      robotSonuc = null;
      var k = $('#rSonuc');
      if (k) {
        k.innerHTML = '<h2>Kaydedildi ✓</h2><p>' + NF.format(r.guncellenen) + ' satır güncellendi, ' + NF.format(r.yeni) + ' yeni satır eklendi' + (r.kilitli ? ', ' + r.kilitli + ' kilitli satır atlandı' : '') + '.</p>' +
          '<p>Genel piyasa değişimi: <b>' + yuzde(r.genel_degisim) + '</b>. Robot fiyatlı satırlar bu değişimi otomatik aldı. <b>Elle fiyat</b> girdiğiniz satırlar değişmedi.</p>' +
          (r.genel_degisim ? '<button class="btn koyu" id="rElle">Elle fiyatlı satırlara da ' + yuzde(r.genel_degisim) + ' uygula</button>' : '');
        var e = $('#rElle'); if (e) e.onclick = function () {
          api('toplu_uygula', { filtre: {}, tip: 'yuzde', oran: r.genel_degisim, hedef: 'elle', aciklama: 'Robot piyasa değişimi elle fiyatlara (' + r.genel_degisim + '%)' })
            .then(function (x) { bildir(x.adet + ' elle fiyat güncellendi'); e.remove(); }).catch(function () {});
        };
      }
      api('markalar').then(function (l) { markaListesi = l; });
      gecmisCizRobot();
    }).catch(function () { if (b) b.disabled = false; });
  }
  function otomatikRobot() {
    api('ayarlar').then(function (A) {
      if (A.robot_oto !== '1') return;
      api('robot_log').then(function (l) {
        var son = l.filter(function (r) { return String(r.kaynak).indexOf('Başlangıç') < 0; })[0];
        var yas = son ? (Date.now() - new Date(String(son.tarih).replace(' ', 'T')).getTime()) / 36e5 : 999;
        if (yas < 24) return;
        bildir('Fiyat robotu arka planda piyasayı tarıyor…');
        robotTara(A.robot_url, +A.robot_min_adet || 3, true);
      });
    });
  }

  // ---------- ARAÇ KATALOĞU (TSB) ----------
  var katalogHazir = null;
  function cizKatalog(k) {
    k.innerHTML = '<h1 class="bas">Araç Kataloğu</h1><p class="bas-alt">TSB kasko değer listesi: Türkiye\'deki tüm marka, model, motor ve paketler. İlanı az olan araçlara da fiyat verilmesini, versiyon farkının hesaplanmasını ve sitedeki kasa / yakıt / vites / motor seçimlerini sağlar.</p>' +
      '<div id="kDurum" class="kartlar">Yükleniyor…</div>' +
      '<div class="iki-kolon"><div class="kutu"><h2>TSB listesini güncelle</h2><p class="soluk" style="margin-top:0">TSB listeyi ayda birkaç kez yayımlar. Otomatik indirme sunucunuzun TSB\'ye bağlanabilmesine bağlıdır; olmazsa tsb.org.tr\'den indirdiğiniz Excel\'i seçin.</p>' +
      '<div class="satirlar"><button class="btn ana" id="kTsb">⬇ TSB\'den otomatik indir</button><label class="btn" style="font-weight:500">📁 Excel dosyası seç<input type="file" id="kDosya" accept=".xlsx,.xls" hidden></label></div>' +
      '<div class="ilerleme"><i id="kCubuk"></i></div><div class="log" id="kLog">Hazır.</div><div id="kOnizle"></div></div>' +
      '<div class="kutu"><h2>Kasko → piyasa katsayısı</h2><p class="soluk" style="margin-top:0">İlanı olmayan araçların fiyatı: <b>model-yıl kasko ortalaması × katsayı</b>. Katsayı, hem ilanı hem kaskosu olan araçlardan marka marka otomatik hesaplanır.</p>' +
      '<div class="satirlar"><label style="font-size:12.5px;font-weight:600">Elle katsayı <small class="soluk">(boş = otomatik)</small> <input class="girdi" id="kKatsayi" style="width:90px"></label><button class="btn koyu" id="kKalibre">Kaydet ve yeniden hesapla</button></div>' +
      '<div id="kKal"></div></div></div>' +
      '<div class="iki-kolon"><div class="kutu"><h2>Model eşleştirme</h2><p class="soluk" style="margin-top:0">TSB\'deki ad ile ilan sitelerindeki model adı farklıysa buradan bağlayın. Örn: BMW · TSB başlangıcı <b>320</b> → model <b>3 Serisi</b>.</p>' +
      '<div class="satirlar"><select class="girdi" id="eMarka2"></select><input class="girdi" id="eTsb" placeholder="TSB tip başlangıcı" style="width:150px"><input class="girdi" id="eModel2" placeholder="Sitedeki model" style="width:140px"><button class="btn koyu" id="eEkle">Ekle</button></div>' +
      '<div id="eListe"></div><div class="iki-kolon" style="margin-top:10px"><div><b style="font-size:13px">İlanı var, katalogda yok</b><div class="tablo-kap" style="max-height:220px" id="eIlan"></div></div><div><b style="font-size:13px">Sadece katalogda (ilanı yok)</b><div class="tablo-kap" style="max-height:220px" id="eKasko"></div></div></div></div>' +
      '<div class="kutu"><h2>Görseller</h2><p class="soluk" style="margin-top:0">Marka logosu ve model fotoğrafı yükleyin (PNG/JPG/WEBP, en fazla 3 MB). Fotoğrafı olmayan modellerde kasa tipine göre çizim gösterilir.</p>' +
      '<div class="satirlar"><select class="girdi" id="gMarka"></select></div><div id="gLogo" class="satirlar"></div><div id="gModeller" class="tablo-kap" style="max-height:330px"></div></div></div>' +
      '<div class="kutu"><h2>Katalog</h2><div class="satirlar"><select class="girdi" id="tkMarka"></select><input class="girdi" id="tkAra" placeholder="Model / versiyon ara" style="width:220px"></div><div class="tablo-kap" id="tkTablo" style="max-height:520px"><p class="soluk" style="padding:10px">Marka seçin.</p></div></div>';
    var log = function (m, sifirla) { var l = $('#kLog', k); l.textContent = (sifirla ? '' : l.textContent + '\n') + m; l.scrollTop = 1e9; };
    var cubuk = function (y) { $('#kCubuk', k).style.width = y + '%'; };
    var durum = function () {
      api('katalog_durum').then(function (d) {
        $('#kDurum', k).innerHTML = '<div class="kart"><div class="s">Versiyon (motor/paket)</div><div class="d">' + NF.format(d.versiyon) + '</div></div>' +
          '<div class="kart"><div class="s">Model / marka</div><div class="d">' + NF.format(d.model) + ' <small>/ ' + d.marka + '</small></div></div>' +
          '<div class="kart"><div class="s">Kasko değeri</div><div class="d">' + NF.format(d.deger) + '</div><div class="s">' + (d.yillar && d.yillar.a ? d.yillar.a + '–' + d.yillar.b : '') + '</div></div>' +
          '<div class="kart"><div class="s">Fiyat satırı</div><div class="d">' + NF.format(d.ilan_satir) + ' <small>ilan</small></div><div class="s">+ ' + NF.format(d.kasko_satir) + ' kaskodan</div></div>' +
          '<div class="kart"><div class="s">Liste kaynağı</div><div class="d" style="font-size:14px">' + esc(d.kaynak || 'Henüz yüklenmedi') + '</div></div>';
        var kal = d.kalibrasyon;
        $('#kKal', k).innerHTML = kal.length ? '<div class="tablo-kap" style="max-height:260px;margin-top:10px"><table class="xl"><tr><th>Marka</th><th>Katsayı</th><th>Örnek</th></tr>' + kal.map(function (r) { return '<tr><td>' + (r.marka === '*' ? '<b>Genel (diğer markalar)</b>' : esc(r.marka)) + '</td><td class="s">' + (+r.oran).toFixed(3).replace('.', ',') + '</td><td class="s">' + r.ornek + '</td></tr>'; }).join('') + '</table></div>' : '<p class="soluk">Katalog yüklenince hesaplanır.</p>';
        $('#eListe', k).innerHTML = d.eslestirme.length ? '<div class="tablo-kap" style="max-height:160px"><table class="xl"><tr><th>Marka</th><th>TSB</th><th>Model</th><th></th></tr>' + d.eslestirme.map(function (e) { return '<tr><td>' + esc(e.marka) + '</td><td>' + esc(e.tsb) + '</td><td>' + esc(e.model) + '</td><td><button class="btn kucuk kirmizi" data-esil="' + e.id + '">Sil</button></td></tr>'; }).join('') + '</table></div>' : '';
        $$('[data-esil]', k).forEach(function (b) { b.onclick = function () { api('eslestirme_sil', { id: +b.dataset.esil }).then(durum); }; });
        var tablo = function (l) { return '<table class="xl"><tr><th>Marka</th><th>Model</th><th>Adet</th></tr>' + l.map(function (r) { return '<tr><td>' + esc(r.marka) + '</td><td>' + esc(r.model) + '</td><td class="s">' + r.n + '</td></tr>'; }).join('') + '</table>'; };
        $('#eIlan', k).innerHTML = d.sadece_ilan.length ? tablo(d.sadece_ilan) : '<p class="soluk" style="padding:8px">—</p>';
        $('#eKasko', k).innerHTML = d.sadece_kasko.length ? tablo(d.sadece_kasko) : '<p class="soluk" style="padding:8px">—</p>';
      });
    };
    api('ayarlar').then(function (A) { $('#kKatsayi', k).value = A.kasko_katsayi || ''; });
    var markaDoldur = function () {
      var o = markaSecenek('').replace('Tüm markalar', 'Marka seçin');
      $('#eMarka2', k).innerHTML = o; $('#gMarka', k).innerHTML = o; $('#tkMarka', k).innerHTML = o;
    };
    if (markaListesi.length) markaDoldur(); else api('markalar').then(function (l) { markaListesi = l; markaDoldur(); });
    durum();

    // --- içe aktarma ---
    var isle = function (buf, kaynak) {
      if (!window.XLSX) { log('Excel okuyucu yüklenemedi (xlsx.full.min.js).'); return; }
      log('Excel okunuyor…'); cubuk(30);
      setTimeout(function () {
        try {
          var wb = XLSX.read(buf, { type: 'array' });
          var ham = [];
          wb.SheetNames.forEach(function (sn) {
            var rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' });
            try { ham = ham.concat(KatalogCore.satirlariOku(rows, new Date().getFullYear())); } catch (e) { log('Sayfa "' + sn + '" atlandı: ' + e.message); }
          });
          if (!ham.length) throw new Error('Listede okunabilir satır bulunamadı.');
          log(NF.format(ham.length) + ' tip satırı okundu. Model adları ilan verisiyle eşleştiriliyor…'); cubuk(55);
          api('site_modelleri').then(function (sm) {
            var kat = KatalogCore.katalogOlustur(ham, sm.modeller, sm.eslestirme);
            var ilanModel = {}; sm.modeller.forEach(function (x) { ilanModel[x.marka + '|' + x.model] = 1; });
            var modeller = {}, eslesen = {}, markalar = {};
            kat.forEach(function (x) { modeller[x.marka + '|' + x.model] = 1; markalar[x.marka] = 1; if (ilanModel[x.marka + '|' + x.model]) eslesen[x.marka + '|' + x.model] = 1; });
            katalogHazir = { liste: kat, kaynak: kaynak };
            cubuk(70);
            log(NF.format(kat.length) + ' versiyon · ' + NF.format(Object.keys(modeller).length) + ' model · ' + Object.keys(markalar).length + ' marka. İlan modeliyle eşleşen: ' + NF.format(Object.keys(eslesen).length) + '.');
            var ornek = kat.filter(function (x, i) { return i % Math.max(1, Math.floor(kat.length / 25)) === 0; }).slice(0, 25);
            $('#kOnizle', k).innerHTML = '<div class="tablo-kap" style="max-height:300px;margin-top:10px"><table class="xl"><tr><th>Marka</th><th>Model</th><th>Versiyon</th><th>Kasa</th><th>Yakıt</th><th>Vites</th><th>Motor</th><th>HP</th><th>Son yıl değeri</th></tr>' +
              ornek.map(function (x) { var ys = Object.keys(x.degerler).sort(); var y = ys[ys.length - 1]; return '<tr><td>' + esc(x.marka) + '</td><td>' + esc(x.model) + '</td><td>' + esc(x.versiyon) + '</td><td>' + esc(x.kasa || '—') + '</td><td>' + esc(x.yakit) + '</td><td>' + esc(x.vites) + '</td><td>' + esc(x.motor) + '</td><td class="s">' + (x.beygir || '') + '</td><td class="s">' + y + ': ' + tl(x.degerler[y]) + '</td></tr>'; }).join('') +
              '</table></div><div class="satirlar" style="margin-top:10px"><button class="btn ana" id="kKaydet">✓ Kataloğu kaydet</button><span class="soluk">Mevcut katalog değiştirilir; fiyat tablonuzdaki ayarlar korunur.</span></div>';
            $('#kKaydet', k).onclick = kaydet;
          });
        } catch (e) { log('HATA: ' + e.message); bildir(e.message, true); }
      }, 30);
    };
    var kaydet = function () {
      var h = katalogHazir; if (!h) return;
      $('#kKaydet', k).disabled = true;
      var parca = 1200, i = 0;
      log('Kaydediliyor…');
      var gonder = function () {
        if (i >= h.liste.length) {
          return api('katalog_bitir', { kaynak: h.kaynak }).then(function (r) {
            cubuk(100); log('Bitti. ' + NF.format(r.satir || 0) + ' model-yıl fiyatı kaskodan hesaplandı. Genel katsayı: ' + (r.genel_oran ? (+r.genel_oran).toFixed(3) : '—'));
            bildir('Katalog kaydedildi'); katalogHazir = null; $('#kOnizle', k).innerHTML = '';
            api('markalar').then(function (l) { markaListesi = l; markaDoldur(); }); durum();
          });
        }
        return api('katalog_parca', { liste: h.liste.slice(i, i + parca) }).then(function () {
          i += parca; cubuk(70 + Math.min(29, i / h.liste.length * 29)); return gonder();
        });
      };
      api('katalog_basla', {}).then(gonder).catch(function () { $('#kKaydet', k).disabled = false; });
    };
    $('#kDosya', k).onchange = function () {
      var f = this.files[0]; if (!f) return;
      log('Dosya: ' + f.name, true); cubuk(10);
      f.arrayBuffer().then(function (b) { isle(new Uint8Array(b), 'Excel: ' + f.name); });
      this.value = '';
    };
    $('#kTsb', k).onclick = function () {
      var b = this; b.disabled = true; log('TSB\'ye bağlanılıyor…', true); cubuk(10);
      fetch('api.php?a=tsb_indir', { headers: { 'X-CSRF': csrf } }).then(function (r) {
        var tip = r.headers.get('Content-Type') || '';
        if (!r.ok || tip.indexOf('json') >= 0) return r.text().then(function (t) {
          var j = null; try { j = JSON.parse(t); } catch (e) {}
          throw new Error(j && j.hata ? j.hata : 'Sunucu cevabı: ' + t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300));
        });
        var ad = decodeURIComponent(r.headers.get('X-Dosya') || 'tsb.xlsx'), donem = r.headers.get('X-Donem') || '';
        return r.arrayBuffer().then(function (buf) { log('İndirildi: ' + ad + ' (' + donem + ', ' + NF.format(Math.round(buf.byteLength / 1024)) + ' KB)'); isle(new Uint8Array(buf), 'TSB ' + donem + ' (' + ad + ')'); });
      }).catch(function (e) { log('HATA: ' + e.message + '\nTSB sitesinden Excel\'i indirip "Excel dosyası seç" ile yükleyebilirsiniz.'); bildir(e.message, true); })
        .then(function () { b.disabled = false; });
    };
    $('#kKalibre', k).onclick = function () {
      api('ayar_kaydet', { kasko_katsayi: $('#kKatsayi', k).value.trim().replace(',', '.') }).then(function () { return api('kalibre_et', {}); })
        .then(function (r) { bildir(NF.format(r.satir || 0) + ' satır yeniden hesaplandı'); durum(); });
    };
    $('#eEkle', k).onclick = function () {
      api('eslestirme_ekle', { marka: $('#eMarka2', k).value, tsb: $('#eTsb', k).value, model: $('#eModel2', k).value })
        .then(function (r) { bildir('Eşleştirme eklendi (' + r.guncellenen + ' versiyon güncellendi)'); $('#eTsb', k).value = $('#eModel2', k).value = ''; durum(); });
    };

    // --- görseller ---
    var yukle = function (veri, dosya) {
      var fd = new FormData(); Object.keys(veri).forEach(function (x) { fd.append(x, veri[x]); }); fd.append('dosya', dosya);
      return fetch('api.php?a=gorsel_yukle', { method: 'POST', headers: { 'X-CSRF': csrf }, body: fd }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.hata); return j; }); })
        .catch(function (e) { bildir(e.message, true); throw e; });
    };
    var gorselCiz = function () {
      var m = $('#gMarka', k).value; if (!m) { $('#gLogo', k).innerHTML = ''; $('#gModeller', k).innerHTML = '<p class="soluk" style="padding:10px">Marka seçin.</p>'; return; }
      api('gorseller').then(function (g) {
        var l = g.logo.find(function (x) { return x.marka === m; }) || {};
        $('#gLogo', k).innerHTML = '<span style="display:inline-grid;place-items:center;width:120px;height:56px;border:1px solid var(--c);border-radius:10px;background:#fff">' + (l.url ? '<img src="../' + esc(l.url) + '" style="max-width:100px;max-height:44px">' : '<span class="soluk">logo yok</span>') + '</span>' +
          '<label class="btn">Logo yükle<input type="file" accept="image/*" hidden id="gLogoDosya"></label>';
        $('#gLogoDosya', k).onchange = function () { yukle({ tur: 'logo', marka: m }, this.files[0]).then(function () { bildir('Logo yüklendi'); gorselCiz(); }); };
      });
      api('model_gorselleri', { marka: m }).then(function (l) {
        $('#gModeller', k).innerHTML = '<table class="xl"><tr><th>Model</th><th>Fotoğraf</th><th></th></tr>' + l.map(function (x, i) {
          return '<tr><td>' + esc(x.model) + '</td><td>' + (x.url ? '<img src="../' + esc(x.url) + '" style="height:38px;border-radius:6px">' : '<span class="soluk">—</span>') + '</td><td><label class="btn kucuk">Yükle<input type="file" accept="image/*" hidden data-gm="' + i + '"></label>' + (x.url ? ' <button class="btn kucuk kirmizi" data-gs="' + i + '">Sil</button>' : '') + '</td></tr>';
        }).join('') + '</table>';
        $$('[data-gm]', k).forEach(function (inp) { inp.onchange = function () { yukle({ tur: 'model', marka: m, model: l[+inp.dataset.gm].model }, inp.files[0]).then(function () { bildir('Fotoğraf yüklendi'); gorselCiz(); }); }; });
        $$('[data-gs]', k).forEach(function (b) { b.onclick = function () { api('gorsel_sil', { tur: 'model', marka: m, model: l[+b.dataset.gs].model }).then(gorselCiz); }; });
      });
    };
    $('#gMarka', k).onchange = gorselCiz;

    // --- katalog tablosu ---
    var KASALAR = ['', 'Sedan', 'Hatchback', 'SUV', 'Station Wagon', 'Coupe', 'Cabrio', 'MPV / Ticari', 'Pick-up'];
    var YAKITLAR = ['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik'], VITESLER = ['Manuel', 'Otomatik'];
    var sec = function (alan, l, v) { return '<select class="girdi" data-ka="' + alan + '" style="padding:2px 4px;font-size:12.5px">' + l.map(function (x) { return '<option' + (x === v ? ' selected' : '') + ' value="' + esc(x) + '">' + (x || '—') + '</option>'; }).join('') + '</select>'; };
    var tkZaman, tkCiz = function () {
      var m = $('#tkMarka', k).value; if (!m) return;
      api('katalog_liste', { marka: m, ara: $('#tkAra', k).value.trim() }).then(function (l) {
        $('#tkTablo', k).innerHTML = l.length ? '<table class="xl"><tr><th>Model</th><th>Versiyon</th><th>Kasa</th><th>Yakıt</th><th>Vites</th><th>Motor</th><th>HP</th><th>Kasko (yıl: değer)</th><th>Aktif</th></tr>' + l.map(function (x) {
          var d = String(x.degerler || '').split(',').map(function (p) { var a = p.split(':'); return a[0] + ': ' + tl(+a[1]); }).sort().reverse().slice(0, 3).join(' · ');
          return '<tr data-kid="' + x.id + '"><td><input class="hucre" data-ka="model" value="' + esc(x.model) + '" style="width:120px;text-align:left"></td><td>' + esc(x.versiyon) + '</td><td>' + sec('kasa', KASALAR, x.kasa) + '</td><td>' + sec('yakit', YAKITLAR, x.yakit) + '</td><td>' + sec('vites', VITESLER, x.vites) + '</td>' +
            '<td><input class="hucre" data-ka="motor" value="' + esc(x.motor) + '" style="width:44px"></td><td><input class="hucre" data-ka="beygir" value="' + (x.beygir || '') + '" style="width:50px"></td><td class="soluk">' + d + '</td><td style="text-align:center"><input type="checkbox" data-ka="aktif"' + (x.aktif == 1 ? ' checked' : '') + '></td></tr>';
        }).join('') + '</table>' + (l.length >= 600 ? '<div class="alt-not">İlk 600 satır; aramayla daraltın.</div>' : '') : '<p class="soluk" style="padding:10px">Kayıt yok.</p>';
      });
    };
    $('#tkMarka', k).onchange = tkCiz;
    $('#tkAra', k).oninput = function () { clearTimeout(tkZaman); tkZaman = setTimeout(tkCiz, 300); };
    $('#tkTablo', k).addEventListener('change', function (e) {
      var el = e.target; if (!el.dataset.ka) return;
      var tr = el.closest('tr');
      api('katalog_satir', { id: +tr.dataset.kid, alan: el.dataset.ka, deger: el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value }).then(function () { tr.classList.add('kaydedildi'); setTimeout(function () { tr.classList.remove('kaydedildi'); }, 1000); });
    });
  }

  // ---------- AYARLAR ----------
  var AYAR_GRUPLARI = [
    ['Firma ve site', [['firma_adi', 'Firma adı'], ['firma_alt', 'Alt başlık'], ['telefon', 'Telefon', 'Sitede ve "Hemen ara" butonunda'], ['whatsapp', 'WhatsApp numarası', '90 ile, ör. 905321234567'], ['eposta', 'E-posta adresi'], ['adres', 'Adres'],
      ['teklif_goster', 'Müşteriye ön teklif göster', '1 = göster, 0 = "sizi arayacağız"']]],
    ['Teklif hesabı', [['alim_marji', 'Alım marjı %', 'İlan medyanından düşülen pay'], ['aralik', 'Teklif aralığı ±%'], ['yuvarla', 'Yuvarlama (TL)'], ['yil_kaybi', 'Yıllık değer farkı %', 'Tabloda olmayan yıl tahmini için'],
      ['min_yil', 'En eski model yılı', 'Daha eskisine otomatik teklif yok'], ['max_km', 'En yüksek km', 'Üstüne otomatik teklif yok']]],
    ['Kilometre', [['yillik_km', 'Beklenen yıllık km', 'Piyasa km ortalaması yoksa'], ['km_ceza', 'Fazla her 10.000 km için −%'], ['km_bonus', 'Eksik her 10.000 km için +%'], ['km_sinir', 'Km etkisi en fazla ±%']]],
    ['Hasar', [['lokal_boya', 'Lokal boyalı parça başına −%'], ['boyali', 'Boyalı parça başına −%'], ['degisen', 'Değişen parça başına −%'], ['tavan_kat', 'Tavan / kaput çarpanı', 'Kritik parçalarda kesinti × bu sayı'],
      ['tramer_kat', 'Tramer katsayısı', 'Tramer/piyasa × 100 × katsayı = −%'], ['tramer_sinir', 'Tramer kesintisi en fazla %']]],
    ['Yakıt ve vites farkı (%)', [['yakit_Benzin', 'Benzin'], ['yakit_Dizel', 'Dizel'], ['yakit_LPG', 'LPG'], ['yakit_Hibrit', 'Hibrit'], ['yakit_Elektrik', 'Elektrik'], ['vites_Manuel', 'Manuel'], ['vites_Otomatik', 'Otomatik']]],
    ['Bildirimler', [['bildirim_eposta', 'Bildirim e-postası', 'Mesajlar ve talepler buraya gelir; Cloudflare\'de doğrulanmış adres olmalı'], ['tg_token', 'Telegram bot anahtarı', 'Sağdaki "Telegram bildirimleri" kutusundaki adımlarla alınır'], ['wa_bildirim_tel', 'WhatsApp bildirim numarası', '90 ile, ör. 905418673478'],
      ['wa_bildirim_anahtar', 'WhatsApp bildirim anahtarı (CallMeBot)', 'Aşağıdaki kutudaki adımlarla alınır'], ['bildirim_talep', 'Yeni teklif talebinde de bildir', '1 = evet, 0 = hayır']]],
    ['Değerleme sınırı', [['sorgu_gunluk', 'Bir numara günde en fazla kaç değerleme yapabilir'], ['sorgu_muaf', 'Sınırsız numaralar', 'Virgülle ayır, ör. 05011763994. 3 gün peş peşe değerleme yapan numara sırayla 3 gün, 1 hafta, 10 gün bekletilir']]],
    ['Robot', [['robot_url', 'AraçRadar veri adresi'], ['robot_min_adet', 'En az ilan sayısı'], ['robot_oto', 'Panel açılınca otomatik tara', '1 = son tarama 24 saatten eskiyse tara ve kaydet']]]
  ];
  // ---------- site içeriği: metinler, donanım listesi, görseller ----------
  // site cümlelerini ana sayfadaki data-metin etiketlerinden okur (varsayılan = sayfadaki yazı)
  function htmlMetne(h) { return h.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s*\n\s*/g, '\n').replace(/[ \t]+/g, ' ').trim(); }
  var SITE_GORSEL = [['promo1', 'Ara reklam: ekspertiz kartı'], ['promo2', 'Ara reklam: 2 dakikada teklif'], ['promo3', 'Ara reklam: Marmara kartı'], ['manset1', 'Manşet 1 (aynı gün sat)'], ['manset2', 'Manşet 2 (ücretsiz ekspertiz)'], ['manset3', 'Manşet 3 (acil sat)'], ['manset4', 'Manşet 4 (filo satışı)'], ['manset5', 'Manşet 5 (noter / evrak)'], ['adim1', '1. adım kartı'], ['adim2', '2. adım kartı'], ['adim3', '3. adım kartı'], ['adim4', '4. adım kartı'], ['galeri1', 'Galeri 1 (büyük)'], ['galeri2', 'Galeri 2'], ['galeri3', 'Galeri 3'], ['galeri4', 'Galeri 4'], ['galeri5', 'Galeri 5'], ['galeri6', 'Galeri 6'], ['galeri7', 'Galeri 7'], ['galeri8', 'Galeri 8']];
  function cizIcerik(k) {
    k.innerHTML = '<h1 class="bas">Site İçeriği</h1><p class="bas-alt">Ana sayfadaki cümleleri, sihirbazdaki donanım seçeneklerini ve sitedeki fotoğrafları buradan değiştir. Değişiklikler kaydettiğin anda sitede görünür.</p>' +
      '<div class="iki-kolon"><div><div class="kutu"><h2>Sitedeki cümleler</h2><p class="soluk" style="margin-top:0"><b>*yıldız arası*</b> turuncu vurgulu yazılır; Enter ile alt satıra geçilir. Kutuyu boşaltıp kaydedersen ilk hâline döner.</p><div id="mListe">Yükleniyor…</div>' +
      '<div class="satirlar yapiskan"><button class="btn ana" id="mKaydet">Cümleleri kaydet</button><a class="btn" href="../" target="_blank">Siteyi aç ↗</a></div></div></div>' +
      '<div><div class="kutu"><h2>Donanım seçenekleri</h2><p class="soluk" style="margin-top:0">Müşteri değerleme sırasında bunları işaretleyebilir. <b>Etki %</b>: teklife eklenecek oran (0 = fiyatı değiştirmez). <b>Koşul</b>: boş = her araçta, <b>otomatik</b> = sadece otomatik vitesli araçlarda, ya da marka listesi (ör. BMW, MINI).</p>' +
      '<div class="tablo-kap" style="max-height:none"><table class="xl" id="dTablo"></table></div><div class="satirlar" style="margin-top:10px"><button class="btn" id="dEkle">+ Satır ekle</button><button class="btn ana" id="dKaydetD">Donanımları kaydet</button></div></div>' +
      '<div class="kutu"><h2>Sitedeki fotoğraflar</h2><p class="soluk" style="margin-top:0">Kendi galerinden gerçek araç fotoğrafları yükle. Adım kartlarındaki çizimlerin yerine geçer; galeri fotoğrafı yüklersen ana sayfada "Galerimizden" bölümü açılır. PNG/JPG/WEBP, en fazla 3 MB.</p><div class="site-gorsel" id="sgListe">Yükleniyor…</div></div>' +
      '<div class="kutu"><h2>Talep fotoğrafları</h2><p class="soluk" style="margin-top:0">Müşterilerin yüklediği fotoğraflar veritabanında yer kaplar (ücretsiz planda toplam 500 MB). Eski taleplerin fotoğraflarını buradan silebilirsin.</p><div id="fDurum" class="soluk">…</div>' +
      '<div class="satirlar" style="margin-top:8px"><select class="girdi" id="fGun" style="width:auto"><option value="30">30 günden eski</option><option value="60">60 günden eski</option><option value="90" selected>90 günden eski</option><option value="180">180 günden eski</option></select><button class="btn kirmizi" id="fSil">Fotoğrafları sil</button></div></div></div></div>';

    // cümleler
    Promise.all([fetch('../index.html', { cache: 'no-store' }).then(function (r) { return r.text(); }), api('metinler')]).then(function (x) {
      var doc = new DOMParser().parseFromString(x[0], 'text/html'), kayitli = x[1] || {}, gruplar = {}, sira = [];
      $$('[data-metin]', doc).forEach(function (el) {
        var b = el.dataset.bolum || 'Diğer'; if (!gruplar[b]) { gruplar[b] = []; sira.push(b); }
        gruplar[b].push({ k: el.dataset.metin, etiket: el.dataset.etiket || el.dataset.metin, varsayilan: htmlMetne(el.innerHTML) });
      });
      $('#mListe', k).innerHTML = sira.map(function (b) {
        return '<details class="metin-grup"' + (b === sira[0] ? ' open' : '') + '><summary>' + esc(b) + ' <small>' + gruplar[b].length + ' alan</small></summary>' + gruplar[b].map(function (m) {
          var deg = kayitli[m.k] !== undefined, v = deg ? kayitli[m.k] : m.varsayilan, uzun = m.varsayilan.length > 60;
          return '<label class="metin-alan' + (deg ? ' degisti' : '') + '"><span>' + esc(m.etiket) + (deg ? ' <i>değiştirildi</i>' : '') + '</span>' +
            '<textarea class="girdi" rows="' + (uzun ? 3 : 1) + '" data-mk="' + esc(m.k) + '" data-v="' + esc(m.varsayilan) + '">' + esc(v) + '</textarea></label>';
        }).join('') + '</details>';
      }).join('');
    }).catch(function (e) { $('#mListe', k).textContent = 'Cümleler okunamadı: ' + e.message; });
    $('#mKaydet', k).onclick = function () {
      var d = {};
      $$('[data-mk]', k).forEach(function (t) { var v = t.value.replace(/\r/g, ''); d[t.dataset.mk] = v.trim() === '' || v.trim() === t.dataset.v ? '' : v; });
      api('metin_kaydet', { degerler: d }).then(function () { bildir('Cümleler kaydedildi'); cizIcerik(k); });
    };

    // donanım listesi
    var donanim = [];
    var dCiz = function () {
      $('#dTablo', k).innerHTML = '<tr><th>Donanım adı</th><th>Etki %</th><th>Koşul</th><th></th></tr>' + donanim.map(function (d, i) {
        return '<tr><td><input class="girdi" data-di="' + i + '" data-a="ad" value="' + esc(d.ad) + '"></td><td><input class="girdi kucuk-girdi" data-di="' + i + '" data-a="etki" value="' + esc(String(d.etki || 0).replace('.', ',')) + '"></td>' +
          '<td><input class="girdi" data-di="' + i + '" data-a="kosul" value="' + esc(d.kosul || '') + '" placeholder="boş = hepsi"></td><td><button class="btn kucuk kirmizi" data-dsil="' + i + '">Sil</button></td></tr>';
      }).join('');
    };
    api('ayarlar').then(function (A) { try { donanim = JSON.parse(A.donanim_liste || '[]'); } catch (e) { donanim = []; } dCiz(); });
    $('#dTablo', k).oninput = function (e) { var i = e.target.dataset.di; if (i === undefined) return; donanim[+i][e.target.dataset.a] = e.target.dataset.a === 'etki' ? (parseFloat(e.target.value.replace(',', '.')) || 0) : e.target.value; };
    $('#dTablo', k).onclick = function (e) { var b = e.target.closest('[data-dsil]'); if (b) { donanim.splice(+b.dataset.dsil, 1); dCiz(); } };
    $('#dEkle', k).onclick = function () { donanim.push({ ad: '', etki: 0, kosul: '' }); dCiz(); };
    $('#dKaydetD', k).onclick = function () {
      var l = donanim.map(function (d) { return { ad: String(d.ad || '').trim(), etki: +d.etki || 0, kosul: String(d.kosul || '').trim() }; }).filter(function (d) { return d.ad; });
      api('ayar_kaydet', { donanim_liste: JSON.stringify(l) }).then(function () { bildir('Donanım seçenekleri kaydedildi'); });
    };

    // site görselleri
    var sgCiz = function () {
      api('site_gorselleri').then(function (g) {
        $('#sgListe', k).innerHTML = SITE_GORSEL.map(function (s) {
          var u = g[s[0]];
          return '<div class="sg-kart"><div class="sg-onizle">' + (u ? '<img src="../' + esc(u) + '" alt="">' : '<span>Görsel yok</span>') + '</div><b>' + esc(s[1]) + '</b>' +
            '<div class="satirlar"><label class="btn kucuk">Yükle<input type="file" accept="image/*" hidden data-sg="' + s[0] + '"></label>' + (u ? '<button class="btn kucuk kirmizi" data-sgsil="' + s[0] + '">Sil</button>' : '') + '</div></div>';
        }).join('');
      });
    };
    $('#sgListe', k).onchange = function (e) {
      var i = e.target; if (!i.dataset.sg || !i.files[0]) return;
      var fd = new FormData(); fd.append('tur', 'site'); fd.append('marka', i.dataset.sg); fd.append('dosya', i.files[0]);
      fetch('api.php?a=gorsel_yukle', { method: 'POST', headers: { 'X-CSRF': csrf }, body: fd }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.hata); }); })
        .then(function () { bildir('Fotoğraf yüklendi'); sgCiz(); }).catch(function (er) { bildir(er.message, true); });
    };
    $('#sgListe', k).onclick = function (e) { var b = e.target.closest('[data-sgsil]'); if (b) api('gorsel_sil', { tur: 'site', marka: b.dataset.sgsil }).then(function () { bildir('Silindi'); sgCiz(); }); };
    sgCiz();

    // talep fotoğrafları
    var fDurum = function () { api('foto_durum').then(function (d) { $('#fDurum', k).textContent = NF.format(d.adet) + ' fotoğraf · ' + (d.boyut / 1048576).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' MB'; }); };
    $('#fSil', k).onclick = function () {
      if (!confirm($('#fGun', k).value + ' günden eski taleplerin fotoğrafları silinsin mi? Talepler silinmez.')) return;
      api('eski_foto_sil', { gun: +$('#fGun', k).value }).then(function (r) { bildir(NF.format(r.silinen) + ' fotoğraf silindi'); fDurum(); });
    };
    fDurum();
  }

  var ILLER_TUM = 'Adana,Adıyaman,Afyonkarahisar,Ağrı,Aksaray,Amasya,Ankara,Antalya,Ardahan,Artvin,Aydın,Balıkesir,Bartın,Batman,Bayburt,Bilecik,Bingöl,Bitlis,Bolu,Burdur,Bursa,Çanakkale,Çankırı,Çorum,Denizli,Diyarbakır,Düzce,Edirne,Elazığ,Erzincan,Erzurum,Eskişehir,Gaziantep,Giresun,Gümüşhane,Hakkâri,Hatay,Iğdır,Isparta,İstanbul,İzmir,Kahramanmaraş,Karabük,Karaman,Kars,Kastamonu,Kayseri,Kilis,Kırıkkale,Kırklareli,Kırşehir,Kocaeli,Konya,Kütahya,Malatya,Manisa,Mardin,Mersin,Muğla,Muş,Nevşehir,Niğde,Ordu,Osmaniye,Rize,Sakarya,Samsun,Şanlıurfa,Siirt,Sinop,Sivas,Şırnak,Tekirdağ,Tokat,Trabzon,Tunceli,Uşak,Van,Yalova,Yozgat,Zonguldak'.split(',');
  var ILLER_MARMARA = ['İstanbul', 'Kocaeli', 'Sakarya', 'Yalova', 'Bursa', 'Bilecik', 'Düzce', 'Bolu', 'Tekirdağ', 'Kırklareli', 'Edirne'];
  function cizAyarlar(k) {
    k.innerHTML = '<h1 class="bas">Ayarlar</h1><p class="bas-alt">Teklif formülü, firma bilgileri ve robot ayarları.</p><div id="aForm">Yükleniyor…</div>';
    api('ayarlar').then(function (A) {
      $('#aForm', k).innerHTML = '<div class="iki-kolon"><div>' + AYAR_GRUPLARI.map(function (g) {
        return '<div class="kutu"><h2>' + g[0] + '</h2><div class="alanlar">' + g[1].map(function (f) { return '<label>' + f[1] + (f[2] ? ' <small>' + f[2] + '</small>' : '') + '<input class="girdi" data-k="' + esc(f[0]) + '" value="' + esc(A[f[0]]) + '"></label>'; }).join('') + '</div></div>';
      }).join('') + '<div class="satirlar"><button class="btn ana" id="aKaydet">Ayarları kaydet</button></div></div>' +
        '<div><div class="kutu"><h2>Teklif simülatörü</h2><p class="soluk" style="margin-top:0">Ayarları kaydettikten sonra bir aracın teklifini test edin.</p><div class="alanlar">' +
        '<label>Marka<input class="girdi" id="sMarka" list="sMarkalar" value="Fiat"></label><datalist id="sMarkalar">' + markaListesi.map(function (m) { return '<option value="' + esc(m) + '">'; }).join('') + '</datalist>' +
        '<label>Model<input class="girdi" id="sModel" value="Egea"></label><label>Yıl<input class="girdi" id="sYil" value="2021"></label><label>Km<input class="girdi" id="sKm" value="90000"></label>' +
        '<label>Yakıt<select class="girdi" id="sYakit"><option>Benzin</option><option selected>Dizel</option><option>LPG</option><option>Hibrit</option><option>Elektrik</option></select></label>' +
        '<label>Vites<select class="girdi" id="sVites"><option>Manuel</option><option>Otomatik</option></select></label>' +
        '<label>Boyalı parça<input class="girdi" id="sBoya" value="0"></label><label>Değişen parça<input class="girdi" id="sDeg" value="0"></label><label>Tramer TL<input class="girdi" id="sTramer" value="0"></label></div>' +
        '<div class="satirlar" style="margin-top:10px"><button class="btn koyu" id="sHesap">Hesapla</button></div><div id="sSonuc"></div></div>' +
        '<div class="kutu"><h2>Parça bazlı boya-değişen kesintileri</h2><p class="soluk" style="margin-top:0">Her parça için ayrı % kesinti yazabilirsin. Boş bıraktığın kutularda yukarıdaki genel oranlar geçerli olur (gri yazı = şu an uygulanan oran).</p>' +
          '<div class="tablo-kap" style="max-height:none"><table class="xl parca-oran"><tr><th>Parça</th><th>Lokal boyalı %</th><th>Boyalı %</th><th>Değişen %</th></tr>' +
          Object.keys(PARCA_AD).map(function (p) {
            var po = {}; try { po = JSON.parse(A.parca_oranlari || '{}') || {}; } catch (e) {}
            var kat = (p === 'kaput' || p === 'tavan') ? (+String(A.tavan_kat).replace(',', '.') || 1) : 1;
            var gen = { lokal: (+String(A.lokal_boya).replace(',', '.') || 0) * kat, boyali: (+String(A.boyali).replace(',', '.') || 0) * kat, degisen: (+String(A.degisen).replace(',', '.') || 0) * kat };
            return '<tr><td>' + esc(PARCA_AD[p]) + '</td>' + ['lokal', 'boyali', 'degisen'].map(function (d) {
              var v = po[p] && po[p][d] !== undefined && po[p][d] !== null ? po[p][d] : '';
              return '<td><input class="girdi kucuk-girdi" data-po="' + p + '|' + d + '" value="' + esc(v) + '" placeholder="' + String(Math.round(gen[d] * 100) / 100).replace('.', ',') + '"></td>';
            }).join('') + '</tr>';
          }).join('') + '</table></div><div class="satirlar" style="margin-top:10px"><button class="btn ana" id="poKaydet">Kesintileri kaydet</button><button class="btn" id="poTemizle">Hepsini boşalt</button></div></div>' +
        '<div class="kutu"><h2>Telegram bildirimleri (önerilen)</h2><p class="soluk" style="margin-top:0">Siteden mesaj, yeni teklif talebi ya da bilgi@ adresine e-posta gelince telefonuna anında Telegram bildirimi gelir. Ücretsizdir, bir kez kurulur.' +
          (A.tg_chat ? ' <b class="art">● Bağlı</b>' : ' <b class="azl">● Bağlı değil</b>') + '</p>' +
          '<ol style="margin:0 0 12px;padding-left:20px;line-height:1.7"><li>Telefonuna <b>Telegram</b> uygulamasını kur, numaranla giriş yap.</li><li>Telegram\'da arama kısmına <b>@BotFather</b> yaz (yanında mavi onay işareti olan), aç ve <b>BAŞLAT</b>\'a bas.</li>' +
          '<li><b>/newbot</b> yaz. Botuna bir ad ver (ör. <i>OTOKABUL Bildirim</i>), sonra sonu <b>bot</b> ile biten bir kullanıcı adı ver (ör. <i>otokabul_bildirim_bot</i>).</li>' +
          '<li>BotFather\'ın gönderdiği mesajdaki uzun anahtarı (<i>123456789:AAH…</i> şeklinde) kopyala.</li><li>Aynı mesajdaki <b>t.me/…</b> bağlantısına dokunarak kendi botunu aç ve <b>BAŞLAT</b>\'a bas.</li>' +
          '<li>Anahtarı aşağıya yapıştırıp <b>Telegram\'ı bağla</b>\'ya bas. Telefonuna "bağlandı" mesajı gelir.</li></ol>' +
          '<div class="satirlar"><input class="girdi" id="tgAnahtar" placeholder="BotFather\'ın verdiği anahtar" style="flex:1;min-width:220px" value="' + esc(A.tg_token || '') + '"><button class="btn ana" id="tgBagla">Telegram\'ı bağla</button></div><div id="tgSonuc" class="soluk" style="margin-top:8px"></div></div>' +
        '<div class="kutu"><h2>WhatsApp bildirimleri (CallMeBot)</h2><p class="soluk" style="margin-top:0">Siteden mesaj, yeni teklif talebi ya da bilgi@ adresine e-posta gelince telefonuna WhatsApp mesajı gelir. Ücretsiz CallMeBot servisiyle çalışır, bir kez kurulur:</p>' +
          '<ol style="margin:0 0 12px;padding-left:20px;line-height:1.7"><li>Bildirimin geleceği telefonda CallMeBot\'un WhatsApp numarasını rehbere kaydet (güncel numara: <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noopener">callmebot.com</a>).</li><li>Bu numaraya WhatsApp\'tan şu mesajı gönder: <b>I allow callmebot to send me messages</b></li><li>Birkaç dakika içinde gelen mesajdaki <b>APIKEY</b> sayısını yukarıdaki "WhatsApp bildirim anahtarı" kutusuna yaz, ayarları kaydet.</li></ol>' +
          '<div class="satirlar"><button class="btn koyu" id="bDene">Deneme bildirimi gönder</button></div><div id="bSonuc" class="soluk" style="margin-top:8px"></div></div>' +
        '<div class="kutu"><h2>Hizmet bölgesi</h2><p class="soluk" style="margin-top:0">Sadece işaretli illerden teklif talebi alınır; diğer illerden gelen ziyaretçiye nazik bir bilgi mesajı gösterilir. Hiçbiri işaretli değilse tüm Türkiye açıktır.</p>' +
          '<div class="kayitli-bolge"><div class="kb-ust"><b>📌 Şu an kayıtlı hizmet bölgesi</b><button class="btn kucuk" id="ilGeri">↩ Kayıtlı bölgeyi geri yükle</button></div><div class="kb-iller" id="ilKayitli"></div><div class="kb-uyari" id="ilFark" hidden>⚠ Aşağıdaki seçim kayıtlı bölgeden farklı. Kaydetmezsen sitede değişiklik olmaz; vazgeçmek için "Kayıtlı bölgeyi geri yükle"ye bas.</div></div>' +
          '<div class="satirlar" style="margin-bottom:8px"><button class="btn kucuk" id="ilMarmara">Marmara + 300 km (önerilen)</button><button class="btn kucuk" id="ilTum">Tümünü aç</button><button class="btn kucuk" id="ilHic">Temizle</button><span class="soluk" id="ilSay"></span></div>' +
          '<div class="il-izgara" id="ilListe">' + ILLER_TUM.map(function (i) { return '<label><input type="checkbox" value="' + esc(i) + '"' + ((',' + (A.hizmet_illeri || '') + ',').indexOf(',' + i + ',') >= 0 ? ' checked' : '') + '>' + esc(i) + '</label>'; }).join('') + '</div>' +
          '<div class="satirlar" style="margin-top:10px"><button class="btn ana" id="ilKaydet">Bölgeyi kaydet</button></div></div>' +
        '<div class="kutu"><h2>🚗 Sitede görünen markalar</h2><p class="soluk" style="margin-top:0">Sihirbazda yalnızca bu markalar çıkar (otomobil, arazi-SUV-pickup, elektrikli, minivan-panelvan). Kamyon, otobüs, traktör, motosiklet ve kasko listesindeki bozuk/tekrar eden model adları pasiftir. Boş bırakırsan varsayılan liste kullanılır. Değiştirince "Kaydet ve uygula"ya bas; işlem "Toplu Fiyat Değişimi → son işlemler"den geri alınabilir.</p>' +
          '<textarea class="girdi" id="mIzin" rows="4" style="width:100%" placeholder="Varsayılan liste">' + esc(A.marka_izin || '') + '</textarea>' +
          '<div class="satirlar" style="margin-top:8px"><button class="btn kucuk" id="mVars">Varsayılan listeyi getir</button><button class="btn ana" id="mUygula">Kaydet ve uygula</button><span class="soluk" id="mSonuc"></span></div></div>' +
        '<div class="kutu" id="mmKutu"><h2>💬 Müşteriye otomatik WhatsApp mesajları</h2><p class="soluk" style="margin-top:0">Randevu isteyen müşteriye hemen teşekkür ve "sizi arayacağız" mesajı gider. Randevu istemeyene 1 gün, 3 gün ve 15 gün sonra birer hatırlatma gider, sonra bir daha yazılmaz. Mesajları Bildirim Köprüsü eklentisi, WhatsApp Web açık bilgisayardan gönderir. Müşteri <b>DUR</b> yazarsa ya da sohbette cevap verirse hatırlatmalar durur; randevu alınca veya talebin durumunu değiştirince bekleyen hatırlatmalar iptal olur.</p>' +
          '<div class="alanlar"><label>Otomatik mesajlar<select class="girdi" id="mmAcik"><option value="1"' + (A.musteri_mesaj === '1' ? ' selected' : '') + '>Açık</option><option value="0"' + (A.musteri_mesaj !== '1' ? ' selected' : '') + '>Kapalı</option></select></label>' +
          '<label>Gönderim saatleri<input class="girdi" id="mmSaat" value="' + esc(A.musteri_saat || '9-20') + '" placeholder="9-20"></label></div>' +
          '<p class="soluk" style="margin:10px 0 6px">Metinlerde kullanılabilecekler: <code>{ad}</code> müşterinin adı · <code>{arac}</code> 2018 Renault Megane · <code>{teklif}</code> " (ön teklifimiz: … TL)" · <code>{firma}</code> · <code>{tel}</code>. *kalın* ve _italik_ WhatsApp\'taki gibi.</p>' +
          [['kabul1', 'Randevu isteyince — 1. mesaj (teşekkür)'], ['kabul2', 'Randevu isteyince — 2. mesaj (sizi arayacağız)'], ['takip1', 'Randevu istemeyene — 1 gün sonra'], ['takip2', 'Randevu istemeyene — 3 gün sonra'], ['takip3', 'Randevu istemeyene — 15 gün sonra (son)']].map(function (x) {
            return '<label class="mm-sablon"><span>' + x[1] + '</span><textarea class="girdi" rows="5" data-mm="mm_' + x[0] + '">' + esc(A['mm_' + x[0]] || '') + '</textarea></label>';
          }).join('') +
          '<div class="satirlar" style="margin-top:10px"><button class="btn ana" id="mmKaydet">Mesaj ayarlarını kaydet</button></div>' +
          '<div class="satirlar" style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--c)"><b>Deneme gönder:</b><input class="girdi" id="mmDTel" placeholder="05xx xxx xx xx" style="width:160px" value="0501 176 39 94"><select class="girdi" id="mmDTur"><option value="kabul1">Randevu 1. mesaj</option><option value="kabul2">Randevu 2. mesaj</option><option value="takip1">1. gün hatırlatma</option><option value="takip2">3. gün hatırlatma</option><option value="takip3">15. gün hatırlatma</option></select><button class="btn koyu" id="mmDene">Gönder</button></div>' +
          '<p class="soluk" style="margin:6px 0 0">Deneme mesajı eklenti açıkken ve gönderim saatleri içinde 1 dakika içinde gider.</p>' +
          '<div id="mmOzet" style="margin-top:14px"></div></div>' +
        '<div class="kutu"><h2>WhatsApp grup köprüsü</h2><p class="soluk" style="margin-top:0">"OTOKABUL Bildirim Köprüsü" Chrome eklentisi, WhatsApp Web açık bir bilgisayarda yeni talepleri gruplara iletir. Eklentiye bu anahtarı yaz. Anahtarı yenilersen eski anahtarlı eklentiler durur.</p>' +
          '<div class="satirlar"><input class="girdi" id="kAnahtar" readonly style="width:320px;font-family:monospace" value="—"><button class="btn kucuk" id="kGoster">Göster</button><button class="btn kucuk" id="kKopya">Kopyala</button><button class="btn kucuk kirmizi" id="kYenile">Yenile</button></div></div>' +
        '<div class="kutu"><h2>Şifre değiştir</h2><div class="alanlar"><label>Mevcut şifre<input type="password" class="girdi" id="pEski"></label><label>Yeni şifre<input type="password" class="girdi" id="pYeni"></label></div><div class="satirlar" style="margin-top:10px"><button class="btn" id="pKaydet">Şifreyi değiştir</button></div></div>' +
        '<div class="kutu"><h2>Yedek</h2><p class="soluk" style="margin-top:0">Tüm fiyatlar, talepler ve ayarlar tek dosyada. Ayda bir indirip saklayın.</p><a class="btn" href="api.php?a=yedek_indir">⬇ Veritabanı yedeğini indir</a></div></div></div>';
      var ilKayitli = String(A.hizmet_illeri || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      var ilKayitliCiz = function () {
        $('#ilKayitli', k).innerHTML = ilKayitli.length ? ilKayitli.map(function (i) { return '<span>' + esc(i) + '</span>'; }).join('') + '<em>' + ilKayitli.length + ' il</em>' : '<em>Tüm Türkiye açık (il sınırı yok)</em>';
      };
      var ilSay = function () {
        var sec = $$('#ilListe input:checked', k).map(function (i) { return i.value; });
        $('#ilSay', k).textContent = sec.length ? sec.length + ' il açık' : 'Tüm Türkiye açık';
        var a1 = sec.length === ILLER_TUM.length ? [] : sec.slice().sort(), a2 = ilKayitli.slice().sort();
        $('#ilFark', k).hidden = a1.join(',') === a2.join(',');
      };
      ilKayitliCiz();

      var ilAyarla = function (l) { $$('#ilListe input', k).forEach(function (i) { i.checked = l === true || (l && l.indexOf(i.value) >= 0); }); ilSay(); };
      $('#ilListe', k).onchange = ilSay; ilSay();
      $('#ilMarmara', k).onclick = function () { ilAyarla(ILLER_MARMARA); };
      $('#ilTum', k).onclick = function () { ilAyarla(true); };
      $('#ilHic', k).onclick = function () { ilAyarla([]); };
      $('#ilGeri', k).onclick = function () { ilAyarla(ilKayitli.length ? ilKayitli : []); bildir('Kayıtlı bölge geri yüklendi'); };
      var kAl = function (y) { api('kopru_anahtar', { yenile: y ? 1 : 0 }).then(function (r) { $('#kAnahtar', k).value = r.anahtar; if (y) bildir('Yeni anahtar oluşturuldu; eklentilere yeniden yaz.'); }); };
      $('#kGoster', k).onclick = function () { kAl(false); };
      $('#kKopya', k).onclick = function () { var v = $('#kAnahtar', k).value; if (v.length > 5) navigator.clipboard.writeText(v).then(function () { bildir('Kopyalandı'); }); else kAl(false); };
      $('#kYenile', k).onclick = function () { if (confirm('Anahtar yenilensin mi? Eski anahtarlı eklentiler çalışmayı bırakır.')) kAl(true); };
      var mmOzet = function () {
        api('mm_ozet').then(function (o) {
          $('#mmOzet', k).innerHTML = '<b>Son mesajlar</b> <span class="soluk">(' + o.bekleyen + ' mesaj gönderilmeyi bekliyor)</span>' +
            (o.son.length ? '<table class="mm-tablo">' + o.son.map(function (m) { return '<tr><td>' + (m.talep_id ? '#' + m.talep_id + ' ' : '') + esc(m.ad || '') + '</td><td>' + esc(m.ad_tur) + '</td><td>' + esc(String(m.zaman).slice(0, 16)) + '</td><td>' + mmDurum(m) + '</td></tr>'; }).join('') + '</table>' : '<p class="soluk">Henüz mesaj yok.</p>') +
            '<div style="margin-top:10px"><b>DUR yazan numaralar</b> <span class="soluk">(bunlara hiçbir otomatik mesaj gitmez)</span></div>' +
            (o.ret.length ? '<div class="kb-iller" style="margin-top:6px">' + o.ret.map(function (r) { return '<span>0' + esc(r.tel) + ' <a href="#" data-ret="' + esc(r.tel) + '" title="Listeden çıkar">✕</a></span>'; }).join('') + '</div>' : '<p class="soluk" style="margin:4px 0">Yok.</p>');
        });
      };
      mmOzet();
      $('#mmOzet', k).onclick = function (e) { var a = e.target.closest('[data-ret]'); if (!a) return; e.preventDefault(); if (confirm('0' + a.dataset.ret + ' numarasına yeniden otomatik mesaj gidebilsin mi?')) api('mm_ret_kaldir', { tel: a.dataset.ret }).then(mmOzet); };
      $('#mmKaydet', k).onclick = function () {
        var d = { musteri_mesaj: $('#mmAcik', k).value, musteri_saat: $('#mmSaat', k).value.replace(/\s/g, '') || '9-20' };
        $$('[data-mm]', k).forEach(function (t) { d[t.dataset.mm] = t.value; });
        api('ayar_kaydet', d).then(function () { bildir('Mesaj ayarları kaydedildi'); });
      };
      $('#mmDene', k).onclick = function () { api('mm_deneme', { tel: $('#mmDTel', k).value, tur: $('#mmDTur', k).value }).then(function () { bildir('Deneme mesajı sıraya alındı'); mmOzet(); }); };
      $('#mVars', k).onclick = function () { api('marka_izin_varsayilan').then(function (r) { $('#mIzin', k).value = r.liste.split(',').join(', '); }); };
      $('#mUygula', k).onclick = function () {
        var v = $('#mIzin', k).value.split(',').map(function (x) { return x.trim(); }).filter(Boolean).join(',');
        api('ayar_kaydet', { marka_izin: v }).then(function () { return api('arac_temizle', {}); }).then(function (r) { $('#mSonuc', k).textContent = r.kapatilan + ' satır pasif, ' + r.acilan + ' satır aktif yapıldı'; bildir('Marka listesi uygulandı'); });
      };
      $('#ilKaydet', k).onclick = function () {
        var l = $$('#ilListe input:checked', k).map(function (i) { return i.value; });
        if (l.length === ILLER_TUM.length) l = [];
        api('ayar_kaydet', { hizmet_illeri: l.join(',') }).then(function () { ilKayitli = l; A.hizmet_illeri = l.join(','); ilKayitliCiz(); ilSay(); bildir(l.length ? l.length + ' ilden talep alınacak' : 'Tüm Türkiye açıldı'); });
      };
      $('#aKaydet', k).onclick = function () {
        var d = {}; $$('[data-k]', k).forEach(function (i) { d[i.dataset.k] = i.value.replace(',', '.'); });
        if (d.robot_url !== undefined) d.robot_url = $('[data-k="robot_url"]', k).value.trim();
        ['firma_adi', 'firma_alt', 'telefon', 'whatsapp', 'eposta', 'adres', 'bildirim_eposta', 'tg_token', 'wa_bildirim_tel', 'wa_bildirim_anahtar'].forEach(function (x) { d[x] = $('[data-k="' + x + '"]', k).value; });
        api('ayar_kaydet', d).then(function () { bildir('Ayarlar kaydedildi'); });
      };
      $('#tgBagla', k).onclick = function () {
        var t = $('#tgAnahtar', k).value.trim(); $('#tgSonuc', k).textContent = 'Bağlanıyor…';
        api('tg_bagla', { token: t }, true).then(function (r) {
          $('#tgSonuc', k).innerHTML = '<b class="art">Bağlandı:</b> ' + esc(r.ad) + ' (' + esc(r.durum) + '). Telefonuna gelen mesajı kontrol et.';
          var f = $('[data-k="tg_token"]', k); if (f) f.value = t;
        }).catch(function (e) { $('#tgSonuc', k).innerHTML = '<span class="azl">' + esc(e.message) + '</span>'; });
      };
      $('#bDene', k).onclick = function () {
        $('#bSonuc', k).textContent = 'Gönderiliyor… (önce ayarları kaydettiğinden emin ol)';
        api('bildirim_dene', {}).then(function (r) { $('#bSonuc', k).innerHTML = 'E-posta: <b>' + esc(r.eposta) + '</b><br>Telefon: <b>' + esc(r.whatsapp) + '</b>'; });
      };
      $('#sHesap', k).onclick = function () {
        var h = {}, P = ['kaput', 'sol_on_kapi', 'sag_on_kapi', 'sol_arka_kapi', 'sag_arka_kapi', 'sol_on_camurluk', 'sag_on_camurluk', 'bagaj', 'on_tampon', 'arka_tampon'], i = 0;
        for (var b = +$('#sBoya', k).value || 0; b > 0 && i < P.length; b--) h[P[i++]] = 'boyali';
        for (var d2 = +$('#sDeg', k).value || 0; d2 > 0 && i < P.length; d2--) h[P[i++]] = 'degisen';
        api('simule', { marka: $('#sMarka', k).value, model: $('#sModel', k).value, yil: +$('#sYil', k).value, km: +$('#sKm', k).value.replace(/\D/g, ''), yakit: $('#sYakit', k).value, vites: $('#sVites', k).value, hasar: h, tramer: +$('#sTramer', k).value.replace(/\D/g, '') })
          .then(function (s) {
            $('#sSonuc', k).innerHTML = '<div style="margin-top:12px"><div class="kalem"><span>Piyasa (baz)</span><b>' + tl(s.baz) + '</b></div>' + s.kalemler.map(function (x) { return '<div class="kalem"><span>' + esc(x[0]) + '</span>' + (x[1] === null ? '' : yuzde(x[1])) + '</div>'; }).join('') +
              '<div class="kalem"><span>Teklif</span><b style="color:var(--v2);font-size:16px">' + (s.min ? tl(s.min) + ' – ' + tl(s.max) + ' TL' : '—') + '</b></div>' + (s.mesaj ? '<p class="soluk">' + esc(s.mesaj) + ' (durum: ' + s.durum + ')</p>' : '') + '</div>';
          });
      };
      var poKaydet = function () {
        var o = {};
        $$('[data-po]', k).forEach(function (i) { var v = i.value.trim().replace(',', '.'); if (v === '' || isNaN(+v)) return; var a = i.dataset.po.split('|'); (o[a[0]] = o[a[0]] || {})[a[1]] = +v; });
        return api('ayar_kaydet', { parca_oranlari: Object.keys(o).length ? JSON.stringify(o) : '' }).then(function () { bildir('Parça kesintileri kaydedildi'); });
      };
      $('#poKaydet', k).onclick = poKaydet;
      $('#poTemizle', k).onclick = function () { $$('[data-po]', k).forEach(function (i) { i.value = ''; }); poKaydet(); };
      $('#pKaydet', k).onclick = function () { api('sifre_degistir', { eski: $('#pEski', k).value, yeni: $('#pYeni', k).value }).then(function () { bildir('Şifre değiştirildi'); $('#pEski', k).value = $('#pYeni', k).value = ''; }); };
    });
  }
})();
