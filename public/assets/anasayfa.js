/* OTOKABUL.COM.TR — ana sayfa: iletişim bağlantıları, marka kartları */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var goster = function (el, href, metin) { if (!el) return; el.hidden = false; if (href) el.href = href; if (metin !== undefined) { var s = el.querySelector('span'); (s || el).textContent = metin; } };

  var yil = $('#yil'); if (yil) yil.textContent = new Date().getFullYear();

  // marka kartları yüklenene kadar iskelet
  var iz = $('#markaIzgara');
  if (iz) iz.innerHTML = new Array(13).join('<button class="iskelet" tabindex="-1"></button>');

  document.addEventListener('otk:firma', function (e) {
    var f = e.detail || {};
    if (f.telefon) {
      var tel = 'tel:' + f.telefon.replace(/[^\d+]/g, '');
      goster($('#seritTel'), tel, f.telefon);
      goster($('#yardimTel'), tel);
    }
    if (f.whatsapp) {
      var wa = 'https://wa.me/' + f.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent('Merhaba, aracımı satmak istiyorum.');
      goster($('#seritWa'), wa); goster($('#yardimWa'), wa); goster($('#altWa'), wa);
      var k = $('#kartWa'); if (k) { k.href = wa; k.target = '_blank'; k.rel = 'noopener'; }
    } else {
      // WhatsApp yoksa ikinci kart telefona yönlensin ya da gizlensin
      var k2 = $('#kartWa');
      if (k2 && f.telefon) { k2.href = 'tel:' + f.telefon.replace(/[^\d+]/g, ''); k2.querySelector('b').textContent = 'Bizi arayın'; k2.querySelector('small').textContent = 'Aracını telefonda anlat, uzmanımız teklifini hazırlasın.'; }
      else if (k2) k2.hidden = true;
    }
    if (f.eposta) {
      var ep = 'mailto:' + f.eposta.trim();
      goster($('#seritEposta'), ep, f.eposta.trim()); goster($('#yardimEposta'), ep); goster($('#altEposta'), ep, f.eposta.trim());
    }
    if (f.telefon) goster($('#altTelLink'), 'tel:' + f.telefon.replace(/[^\d+]/g, ''));
    if (f.adres) {
      var harita = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(f.adres);
      goster($('#seritAdres'), harita, f.adres); var al = $('#altAdresLink'); if (al) al.href = harita;
    }
  });

  document.addEventListener('otk:markalar', function (e) {
    if (!iz) return;
    var l = (e.detail || []).slice(0, 12);
    if (!l.length) { iz.parentNode.parentNode.hidden = true; return; }
    var nf = new Intl.NumberFormat('tr-TR');
    iz.innerHTML = l.map(function (m) {
      return '<button type="button" data-m="' + esc(m.ad) + '">' + (m.logo ? '<img src="' + esc(m.logo) + '" alt="" loading="lazy">' : '<span class="harf">' + esc(m.ad.charAt(0)) + '</span>') +
        '<span>' + esc(m.ad) + '</span></button>';
    }).join('');
    iz.onclick = function (ev) { var b = ev.target.closest('button[data-m]'); if (b && window.OTK) window.OTK.marka(b.dataset.m); };
  });

  // panelden değiştirilen cümleler: *kelime* turuncu vurgu, satır sonu alt satır
  var bicimle = function (m) { return esc(m).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>'); };
  fetch('api.php?a=metinler').then(function (r) { return r.ok ? r.json() : {}; }).then(function (o) {
    Object.keys(o || {}).forEach(function (k) { document.querySelectorAll('[data-metin="' + k + '"]').forEach(function (el) { el.innerHTML = bicimle(o[k]); }); });
  }).catch(function () {});

  // panelden yüklenen gerçek fotoğraflar: adım kartları ve galeri
  fetch('api.php?a=site_gorselleri&t=' + Math.floor(Date.now() / 60000)).then(function (r) { return r.ok ? r.json() : {}; }).then(function (g) {
    g = g || {};
    document.querySelectorAll('[data-gorsel]').forEach(function (el) {
      var u = g[el.dataset.gorsel]; if (u) { el.innerHTML = '<img src="' + esc(u) + '" alt="" loading="lazy">'; el.classList.add('foto-var'); }
    });
    document.querySelectorAll('[data-gorsel-arka]').forEach(function (el) {
      var u = g[el.dataset.gorselArka]; if (u) { el.style.backgroundImage = 'url("' + u.replace(/"/g, '%22') + '")'; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; el.classList.add('foto-var'); if (!el.querySelector('.kb-arka')) { var kb = document.createElement('div'); kb.className = 'kb-arka'; kb.style.backgroundImage = el.style.backgroundImage; el.insertBefore(kb, el.firstChild); } if (!el.querySelector('.foto-logo')) { var fl = document.createElement('span'); fl.className = 'foto-logo'; fl.innerHTML = '<img src="assets/logo-otokabul.png" alt="OTOKABUL.COM.TR">'; el.appendChild(fl); } }
    });
    // tanıtım animasyonu sahneleri
    document.querySelectorAll('[data-gorsel-film]').forEach(function (el) {
      var u = g[el.dataset.gorselFilm]; if (!u) return;
      var kb = document.createElement('div'); kb.className = 'kb-film'; kb.style.backgroundImage = 'url("' + u.replace(/"/g, '%22') + '")'; el.insertBefore(kb, el.firstChild);
    });
    filmBasla();
    var gal = [], i; for (i = 1; i <= 8; i++) if (g['galeri' + i]) gal.push(g['galeri' + i]);
    if (gal.length) {
      $('#galeriIzgara').innerHTML = gal.map(function (u) { return '<figure><img src="' + esc(u) + '" alt="" loading="lazy"></figure>'; }).join('');
      $('#galeri').hidden = false;
    }
  }).catch(function () {});

  // 15 saniyelik tanıtım: sahneler sırayla, ekranda görünmüyorsa durur
  var filmBasladi = false;
  function filmBasla() {
    var f = $('#film'); if (!f || filmBasladi) return; filmBasladi = true;
    var sahneler = f.querySelectorAll('.film-sahne'), n = sahneler.length, cubuk = $('#filmCubuk'), SURE = 3600, i = 0, zam = null, gorunur = true;
    var goster = function (k) {
      i = k;
      Array.prototype.forEach.call(sahneler, function (s, j) { s.classList.toggle('aktif', j === k); if (j === k) { var kb = s.querySelector('.kb-film'); if (kb) { kb.style.animation = 'none'; void kb.offsetWidth; kb.style.animation = ''; } } });
      cubuk.style.transition = 'none'; cubuk.style.width = (k / n * 100) + '%'; void cubuk.offsetWidth;
      cubuk.style.transition = 'width ' + SURE + 'ms linear'; cubuk.style.width = ((k + 1) / n * 100) + '%';
    };
    var oynat = function () { clearTimeout(zam); if (!gorunur) return; zam = setTimeout(function () { goster((i + 1) % n); oynat(); }, SURE); };
    goster(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { var g = e[0].isIntersecting; if (g && !gorunur) { gorunur = true; goster(0); oynat(); } else if (!g) { gorunur = false; clearTimeout(zam); } }, { threshold: 0.25 }).observe(f);
    oynat();
  }
  setTimeout(filmBasla, 2500); // görseller gelmese de çalışsın

  // dönen manşet: 6 sn'de bir kayar, dokunarak / oklarla geçilir
  (function () {
    var ray = $('#mansetRay'); if (!ray) return;
    var kartlar = ray.children, n = kartlar.length, i = 0, zam = null, nokta = $('#mansetNokta');
    nokta.innerHTML = Array.prototype.map.call(kartlar, function (_, j) { return '<button aria-label="' + (j + 1) + '. manşet"></button>'; }).join('');
    var git = function (j) { i = (j + n) % n; ray.style.transform = 'translateX(' + (-100 * i) + '%)'; Array.prototype.forEach.call(nokta.children, function (b, k) { b.classList.toggle('aktif', k === i); }); };
    var basla = function () { clearInterval(zam); if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) zam = setInterval(function () { git(i + 1); }, 6000); };
    nokta.onclick = function (e) { var b = e.target.closest('button'); if (b) { git(Array.prototype.indexOf.call(nokta.children, b)); basla(); } };
    $('#mansetGeri').onclick = function () { git(i - 1); basla(); };
    $('#mansetIleri').onclick = function () { git(i + 1); basla(); };
    var x0 = null;
    ray.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; clearInterval(zam); }, { passive: true });
    ray.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) git(i + (dx < 0 ? 1 : -1)); x0 = null; basla(); });
    var kap = ray.parentNode; kap.addEventListener('mouseenter', function () { clearInterval(zam); }); kap.addEventListener('mouseleave', basla);
    ray.addEventListener('click', function (e) { var a = e.target.closest('a[href="#degerle"]'); if (a) { e.preventDefault(); if (window.OTK) window.OTK.basla(); } });
    git(0); basla();
  })();

  // satıştaki araçlarımız (sahibinden mağazalarımızdan, kendiliğinden güncellenir)
  fetch('api.php?a=satistaki').then(function (r) { return r.ok ? r.json() : []; }).then(function (l) {
    if (!l || !l.length) return;
    var nf = new Intl.NumberFormat('tr-TR'), wa = (window.OTK_FIRMA && window.OTK_FIRMA.whatsapp) || '905418673478';
    var KAT = { otomobil: 'Otomobil', 'arazi-suv-pickup': 'SUV & Pickup', 'minivan-panelvan': 'Minivan & Panelvan', elektrikli: 'Elektrikli' };
    var bas = function (s) { return String(s || '').toLocaleLowerCase('tr').replace(/(^|\s)\S/g, function (c) { return c.toLocaleUpperCase('tr'); }); };
    var kart = function (x) {
      var ad = [x.marka, x.seri, x.model].filter(Boolean).join(' ') || bas(x.baslik).slice(0, 40);
      var alt = [x.yil || '', x.km ? nf.format(x.km) + ' km' : '', x.renk || ''].filter(Boolean).join(' · ');
      var yeni = x.ilan_tarihi && /bugün|dün/i.test(x.ilan_tarihi);
      var waUrl = 'https://wa.me/' + wa + '?text=' + encodeURIComponent('Merhaba, ' + ad + ' (ilan no: ' + x.id + ') aracınızla ilgileniyorum.');
      return '<article class="stok-kart"><a class="sk-foto" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + (x.foto ? '<img src="' + esc(x.foto) + '" alt="' + esc(ad) + '" loading="lazy" referrerpolicy="no-referrer">' : '') +
        (KAT[x.kategori] ? '<span class="sk-rozet">' + KAT[x.kategori] + '</span>' : '') + (yeni ? '<span class="sk-yeni">YENİ</span>' : '') + '</a>' +
        '<div class="sk-ic"><h3>' + esc(ad) + '</h3>' + (alt ? '<div class="sk-alt">' + esc(alt) + '</div>' : '') + '<div class="sk-baslik">' + esc(bas(x.baslik)) + '</div>' +
        '<div class="sk-fiyat">' + (x.fiyat ? nf.format(x.fiyat) + ' TL' : '') + '</div>' +
        '<div class="sk-dug"><a class="sk-ilan" href="' + esc(x.url) + '" target="_blank" rel="noopener">İlanı gör</a><a class="sk-wa" href="' + esc(waUrl) + '" target="_blank" rel="noopener">WhatsApp\'tan sor</a></div></div></article>';
    };
    var iz = $('#stokIzgara'), ilk = 8;
    iz.innerHTML = l.slice(0, ilk).map(kart).join('');
    if (l.length > ilk) { $('#stokTum').hidden = false; $('#stokDaha').onclick = function () { iz.innerHTML = l.map(kart).join(''); $('#stokTum').hidden = true; }; }
    $('#satistaki').hidden = false;
    document.querySelectorAll('.menu-stok').forEach(function (a) { a.hidden = false; });
  }).catch(function () {});

  // son değerlemeler şeridi (kişisel bilgi yok: araç, il, ne kadar önce)
  // şerit: son 24 saatteki gerçek değerlemeler (varsa) + en çok ilanı olan modellerin güncel piyasa ortalaması
  Promise.all([
    fetch('api.php?a=son_degerlemeler').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch('api.php?a=piyasa_nabzi').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
  ]).then(function (v) {
    var son = v[0] || [], pz = v[1] || [], tl = new Intl.NumberFormat('tr-TR');
    if (son.length + pz.length < 3) return;
    var once = function (dk) { return dk < 1 ? 'az önce' : dk < 60 ? dk + ' dk önce' : Math.floor(dk / 60) + ' saat önce'; };
    var h = son.map(function (x) { return '<span><small>' + once(x.dk) + '</small><b>' + esc(x.arac) + '</b>' + (x.il ? ' · ' + esc(x.il) : '') + '</span>'; }).join('') +
      pz.map(function (x) { return '<span><small>piyasa ort.</small><b>' + esc(x.arac) + '</b> · ' + tl.format(x.fiyat) + ' TL</span>'; }).join('');
    var bas = $('#canliSerit .cs-baslik'); if (bas) bas.innerHTML = '<i></i>' + (son.length ? 'Son değerlemeler · Piyasa nabzı' : 'Piyasa nabzı');
    $('#canliIc').innerHTML = h + h; $('#canliIc').style.animationDuration = Math.max(45, (son.length + pz.length) * 4.5) + 's'; $('#canliSerit').hidden = false;
  });

  // rehberden son yazılar
  fetch('api.php?a=rehber_son').then(function (r) { return r.ok ? r.json() : []; }).then(function (l) {
    if (!l || !l.length) return;
    var ay = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    $('#rehberIzgara').innerHTML = l.map(function (y) {
      var t = y.tarih.split('-');
      return '<a class="rb-kart" href="/rehber/' + esc(y.slug) + '/"><small>' + (+t[2]) + ' ' + ay[+t[1] - 1] + ' ' + t[0] + '</small><h3>' + esc(y.baslik) + '</h3><p>' + esc(y.ozet) + '</p><span>Devamını oku →</span></a>';
    }).join('');
    $('#rehberBant').hidden = false;
  }).catch(function () {});

  // "Aracımı değerle" kartı: sihirbaza kaydır
  document.querySelectorAll('[data-odak="sihirbaz"], a[href="#degerle"]').forEach(function (a) {
    a.addEventListener('click', function (ev) { ev.preventDefault(); if (window.OTK) window.OTK.basla(); });
  });

  // iletişim formu: mesaj panele kaydedilir, e-posta ve WhatsApp bildirimi gider
  var mf = $('#mesajForm');
  if (mf) mf.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var d = {}; ['ad', 'tel', 'eposta', 'mesaj', 'web'].forEach(function (k) { d[k] = mf.elements[k].value.trim(); });
    var durum = $('#mesajDurum'), btn = mf.querySelector('.mf-gonder');
    var hata = function (m) { durum.className = 'mf-durum hata'; durum.textContent = m; };
    if (!d.ad) return hata('Lütfen adını yaz.');
    if (d.tel.replace(/\D/g, '').length < 10 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.eposta)) return hata('Sana dönebilmemiz için telefon ya da e-posta adresi yaz.');
    if (d.mesaj.length < 5) return hata('Lütfen mesajını yaz.');
    btn.disabled = true; durum.className = 'mf-durum'; durum.textContent = 'Gönderiliyor…';
    fetch('api.php?a=mesaj', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (r.status >= 500) throw new Error(); return j; }); })
      .then(function (j) {
        if (j.hata) { hata(j.hata); return; }
        mf.reset(); if (window.OKIZ) window.OKIZ('mesaj');
        durum.className = 'mf-durum tamam'; durum.textContent = 'Teşekkürler, mesajın bize ulaştı. En kısa sürede dönüş yapacağız.';
      })
      .catch(function () { hata('Mesaj gönderilemedi. Lütfen bizi telefonla ya da WhatsApp\'tan ara.'); })
      .then(function () { btn.disabled = false; });
  });

  // marka/model rehber sayfalarından gelen bağlantı: sihirbazı o araçla başlat
  try {
    var pr = new URLSearchParams(location.search);
    if (pr.get('marka') && window.OTK && window.OTK.hazirla) window.OTK.hazirla({ marka: pr.get('marka'), model: pr.get('model') || '', yil: pr.get('yil') || '' });
  } catch (e) {}

  // ---------- müşteri yorumları: yalnızca panelde onaylanan gerçek yorumlar ----------
  (function () {
    var izg = $('#yorumIzgara'); if (!izg) return;
    var yildiz = function (n) { n = Math.round(n); return '<span class="yr-y">' + '★★★★★'.slice(0, n) + '<i>' + '★★★★★'.slice(n) + '</i></span>'; };
    fetch('api.php?a=yorumlar').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.adet) { $('#yorumBos').hidden = false; return; }
      $('#yorumOzet').innerHTML = yildiz(d.ort) + ' <b>' + String(d.ort).replace('.', ',') + ' / 5</b> · ' + d.adet + ' gerçek müşteri yorumu. Hepsi aracını OTOKABUL\'a satmış müşterilerimize ait ve ekibimizin onayından geçti.';
      izg.innerHTML = d.liste.map(function (y) {
        return '<article class="yr-kart">' + yildiz(y.puan) + '<p class="yr-metin">' + esc(y.metin) + '</p>' +
          (y.yanit ? '<p class="yr-yanit"><b>OTOKABUL:</b> ' + esc(y.yanit) + '</p>' : '') +
          '<footer><b>' + esc(y.ad) + '</b>' + (y.il ? ' · ' + esc(y.il) : '') + (y.arac ? '<br><span>' + esc(y.arac) + '</span>' : '') + (+y.dogrulanmis ? '<em>✅ Doğrulanmış müşteri</em>' : '') + '</footer></article>';
      }).join('');
    }).catch(function () {});

    var form = $('#yorumForm'), puan = 0, no = 0, tk = '';
    var puanYaz = function (p) { puan = p; Array.prototype.forEach.call($('#yorumPuan').children, function (b) { b.classList.toggle('dolu', +b.dataset.p <= p); }); };
    $('#yorumPuan').onclick = function (e) { var b = e.target.closest('button'); if (b) puanYaz(+b.dataset.p); };
    var ac = function () { form.hidden = false; $('#yorumAc').hidden = true; setTimeout(function () { form.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60); };
    $('#yorumAc').onclick = ac;
    var hashBak = function () {
      var m = /^#yorum=(\d+)\.([a-f0-9]+)$/i.exec(location.hash); if (!m) { if (location.hash === '#yorum') ac(); return; }
      no = +m[1]; tk = m[2]; ac();
      fetch('api.php?a=yorum_talep&no=' + no + '&t=' + tk).then(function (r) { return r.ok ? r.json() : null; }).then(function (t) {
        if (!t) { no = 0; tk = ''; return; }
        $('#yorumDogru').hidden = false;
        if (!form.ad.value) form.ad.value = t.ad; if (!form.il.value) form.il.value = t.il; if (!form.arac.value) form.arac.value = t.arac;
      });
    };
    window.addEventListener('hashchange', hashBak); hashBak();
    form.onsubmit = function (e) {
      e.preventDefault();
      var h = $('#yorumHata'), btn = form.querySelector('.yr-gonder'); h.hidden = true;
      if (!puan) { h.textContent = 'Lütfen yıldızlardan puanını seç.'; h.hidden = false; return; }
      btn.disabled = true; btn.textContent = 'Gönderiliyor…';
      fetch('api.php?a=yorum_gonder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad: form.ad.value, il: form.il.value, arac: form.arac.value, metin: form.metin.value, puan: puan, no: no, t: tk }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.hata || 'Gönderilemedi'); return j; }); })
        .then(function () { form.hidden = true; $('#yorumTesekkur').hidden = false; if (history.replaceState && /^#yorum/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); })
        .catch(function (er) { h.textContent = er.message; h.hidden = false; btn.disabled = false; btn.textContent = 'Yorumu gönder'; });
    };
  })();
})();
