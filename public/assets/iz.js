/* OTOKABUL — site istatistikleri (çerezsiz, kişisel veri yok) */
(function () {
  try {
    if (/\/yonetim/.test(location.pathname) || navigator.webdriver) return;
    var ls = window.localStorage, ss = window.sessionStorage, rnd = function () { return Math.random().toString(36).slice(2) + Date.now().toString(36); };
    var v = ls.getItem('ok_v'); if (!v) { v = rnd(); ls.setItem('ok_v', v); }
    var s = ss.getItem('ok_s'), ilk = !s; if (!s) { s = rnd(); ss.setItem('ok_s', s); }
    var q = new URLSearchParams(location.search);
    var gonder = function (olay, ilkMi) {
      var d = { v: v, s: s, o: olay, p: location.pathname, i: ilkMi ? 1 : 0, r: ilkMi ? document.referrer : '', u: q.get('utm_source') || '', k: q.get('utm_campaign') || '', m: q.get('utm_medium') || '',
        g: q.has('gclid') ? 1 : 0, f: q.has('fbclid') ? 1 : 0, w: screen.width, l: navigator.language || '' };
      var b = JSON.stringify(d);
      if (navigator.sendBeacon) navigator.sendBeacon('/api.php?a=iz', new Blob([b], { type: 'application/json' }));
      else fetch('/api.php?a=iz', { method: 'POST', body: b, keepalive: true });
    };
    var olaylar = {};
    window.OKIZ = function (olay) { if (olaylar[olay]) return; olaylar[olay] = 1; gonder(olay, false); };
    gonder('goruntuleme', ilk);
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null; if (!a) return;
      var h = a.getAttribute('href') || '';
      if (/^tel:/.test(h)) window.OKIZ('telefon'); else if (/wa\.me|whatsapp/i.test(h)) window.OKIZ('whatsapp');
    }, true);
  } catch (e) {}
})();
