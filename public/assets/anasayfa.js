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
    if (f.adres) goster($('#seritAdres'), null, f.adres);
  });

  document.addEventListener('otk:markalar', function (e) {
    if (!iz) return;
    var l = (e.detail || []).slice(0, 12);
    if (!l.length) { iz.parentNode.parentNode.hidden = true; return; }
    var nf = new Intl.NumberFormat('tr-TR');
    iz.innerHTML = l.map(function (m) {
      return '<button type="button" data-m="' + esc(m.ad) + '">' + (m.logo ? '<img src="' + esc(m.logo) + '" alt="" loading="lazy">' : '<span class="harf">' + esc(m.ad.charAt(0)) + '</span>') +
        '<span>' + esc(m.ad) + '</span>' + (m.n > 0 ? '<small>' + nf.format(m.n) + ' ilan</small>' : '') + '</button>';
    }).join('');
    iz.onclick = function (ev) { var b = ev.target.closest('button[data-m]'); if (b && window.OTK) window.OTK.marka(b.dataset.m); };
  });

  // "Aracımı değerle" kartı: sihirbaza kaydır
  document.querySelectorAll('[data-odak="sihirbaz"], a[href="#degerle"]').forEach(function (a) {
    a.addEventListener('click', function (ev) { ev.preventDefault(); var s = $('#sihirbaz'); if (s) s.scrollIntoView({ behavior: 'smooth', block: window.innerWidth < 980 ? 'start' : 'center' }); });
  });
})();
