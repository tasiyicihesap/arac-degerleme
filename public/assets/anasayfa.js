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
  fetch('api.php?a=site_gorselleri').then(function (r) { return r.ok ? r.json() : {}; }).then(function (g) {
    g = g || {};
    document.querySelectorAll('[data-gorsel]').forEach(function (el) {
      var u = g[el.dataset.gorsel]; if (u) { el.innerHTML = '<img src="' + esc(u) + '" alt="" loading="lazy">'; el.classList.add('foto-var'); }
    });
    var gal = [], i; for (i = 1; i <= 8; i++) if (g['galeri' + i]) gal.push(g['galeri' + i]);
    if (gal.length) {
      $('#galeriIzgara').innerHTML = gal.map(function (u) { return '<figure><img src="' + esc(u) + '" alt="" loading="lazy"></figure>'; }).join('');
      $('#galeri').hidden = false;
    }
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
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.hata) { hata(j.hata); return; }
        mf.reset();
        durum.className = 'mf-durum tamam'; durum.textContent = 'Teşekkürler, mesajın bize ulaştı. En kısa sürede dönüş yapacağız.';
      })
      .catch(function () { hata('Mesaj gönderilemedi. Lütfen bizi telefonla ya da WhatsApp\'tan ara.'); })
      .then(function () { btn.disabled = false; });
  });
})();
