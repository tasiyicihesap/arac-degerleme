/* OTOKABUL — araç değerleme sihirbazı */
(function () {
  'use strict';
  var $ = function (s, k) { return (k || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var tl = function (n) { return new Intl.NumberFormat('tr-TR').format(Math.round(n)) + ' TL'; };
  var api = function (a, q, govde) {
    var url = 'api.php?a=' + a + (q ? '&' + Object.keys(q).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&') : '');
    return fetch(url, govde ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde) } : {})
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.hata || 'Hata'); return j; }); });
  };

  var ILLER = 'Adana,Adıyaman,Afyonkarahisar,Ağrı,Aksaray,Amasya,Ankara,Antalya,Ardahan,Artvin,Aydın,Balıkesir,Bartın,Batman,Bayburt,Bilecik,Bingöl,Bitlis,Bolu,Burdur,Bursa,Çanakkale,Çankırı,Çorum,Denizli,Diyarbakır,Düzce,Edirne,Elazığ,Erzincan,Erzurum,Eskişehir,Gaziantep,Giresun,Gümüşhane,Hakkâri,Hatay,Iğdır,Isparta,İstanbul,İzmir,Kahramanmaraş,Karabük,Karaman,Kars,Kastamonu,Kayseri,Kilis,Kırıkkale,Kırklareli,Kırşehir,Kocaeli,Konya,Kütahya,Malatya,Manisa,Mardin,Mersin,Muğla,Muş,Nevşehir,Niğde,Ordu,Osmaniye,Rize,Sakarya,Samsun,Şanlıurfa,Siirt,Sinop,Sivas,Şırnak,Tekirdağ,Tokat,Trabzon,Tunceli,Uşak,Van,Yalova,Yozgat,Zonguldak'.split(',');
  var PARCALAR = [
    ['on_tampon', 'Ön Tampon'], ['kaput', 'Motor Kaputu'], ['tavan', 'Tavan'], ['bagaj', 'Bagaj Kapağı'], ['arka_tampon', 'Arka Tampon'],
    ['sol_on_camurluk', 'Sol Ön Çamurluk'], ['sol_on_kapi', 'Sol Ön Kapı'], ['sol_arka_kapi', 'Sol Arka Kapı'], ['sol_arka_camurluk', 'Sol Arka Çamurluk'],
    ['sag_on_camurluk', 'Sağ Ön Çamurluk'], ['sag_on_kapi', 'Sağ Ön Kapı'], ['sag_arka_kapi', 'Sağ Arka Kapı'], ['sag_arka_camurluk', 'Sağ Arka Çamurluk']
  ];
  var PAD = {}; PARCALAR.forEach(function (p) { PAD[p[0]] = p[1]; });
  var DURUM_SIRA = ['orijinal', 'lokal', 'boyali', 'degisen'];
  var DURUM_AD = { orijinal: 'Orijinal', lokal: 'Lokal boyalı', boyali: 'Boyalı', degisen: 'Değişen' };

  var firma = {};
  var S = { hasar: {}, tramerVar: null, agir: null };
  var adim = 0;
  var cache = {};

  var ADIMLAR = [
    { ad: 'marka', baslik: 'Aracının markası ne?', ciz: cizMarka, gecerli: function () { return !!S.marka; } },
    { ad: 'yil', baslik: 'Model yılı?', ciz: cizYil, gecerli: function () { return !!S.yil; } },
    { ad: 'model', baslik: 'Modeli hangisi?', ciz: cizModel, gecerli: function () { return !!S.model; } },
    { ad: 'kasa', baslik: 'Kasa tipi', ciz: function (k) { cizSecim(k, 'kasa'); }, gecerli: function () { return !!S.kasa; } },
    { ad: 'yakit', baslik: 'Yakıt tipi', ciz: function (k) { cizSecim(k, 'yakit'); }, gecerli: function () { return !!S.yakit; } },
    { ad: 'vites', baslik: 'Vites tipi', ciz: function (k) { cizSecim(k, 'vites'); }, gecerli: function () { return !!S.vites; } },
    { ad: 'motor', baslik: 'Motor seçeneği', ciz: cizMotor, gecerli: function () { return S.motor !== undefined; } },
    { ad: 'versiyon', baslik: 'Donanım paketi', ciz: cizVersiyon, gecerli: function () { return S.versiyon !== undefined; } },
    { ad: 'km', baslik: 'Kilometre ve renk', ciz: cizKm, gecerli: function () { return S.km > 0; } },
    { ad: 'hasar', baslik: 'Hasar durumu', ciz: cizHasar, gecerli: function () { return S.tramerVar !== null && S.agir !== null && (!S.tramerVar || S.tramer > 0); } },
    { ad: 'ek', baslik: 'Donanım, açıklama ve fotoğraflar', ciz: cizEk },
    { ad: 'iletisim', baslik: 'Teklifini nereye iletelim?', ciz: cizIletisim, gecerli: function () { return S.ad && S.ad.trim().length > 1 && (S.tel || '').replace(/\D/g, '').length >= 10 && S.kvkk; } },
    { ad: 'sonuc', baslik: '', ciz: cizSonuc }
  ];

  var govde = $('#sbGovde'), btnI = $('#btnIleri'), btnG = $('#btnGeri');

  var yon = 1;
  function git(n) {
    yon = n < adim ? -1 : 1;
    adim = Math.max(0, Math.min(ADIMLAR.length - 1, n));
    var A = ADIMLAR[adim], son = adim === ADIMLAR.length - 1;
    $('#sbAdimYazi').textContent = son ? 'Teklifin hazır' : (adim + 1) + ' / ' + (ADIMLAR.length - 1);
    $('#sbCubuk').style.width = (son ? 100 : (adim / (ADIMLAR.length - 1)) * 100) + '%';
    btnG.hidden = adim === 0 || son;
    $('#sbAlt').style.display = son ? 'none' : '';
    btnI.textContent = adim === ADIMLAR.length - 2 ? 'Teklifimi göster →' : 'Devam →';
    secimleriCiz();
    govde.innerHTML = (A.baslik ? '<h2>' + A.baslik + '</h2>' : '') + '<div id="icerik"><div class="yukleniyor">Yükleniyor…</div></div>';
    govde.scrollTop = 0;
    govde.style.maxHeight = son ? 'none' : '';
    A.ciz($('#icerik'));
    guncelleBtn();
    if (adim > 0 && window.innerWidth < 980) $('#sihirbaz').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function guncelleBtn() { var A = ADIMLAR[adim]; btnI.disabled = A.gecerli ? !A.gecerli() : false; }
  function sonraki() { var A = ADIMLAR[adim]; if (A.gecerli && !A.gecerli()) return; if (adim === ADIMLAR.length - 2) return gonder(); git(adim + 1); }
  btnI.onclick = sonraki;
  btnG.onclick = function () { git(adim - 1); };

  function secimleriCiz() {
    var ets = [];
    [['marka', 0], ['yil', 1], ['model', 2], ['kasa', 3], ['yakit', 4], ['vites', 5], ['motorAd', 6], ['versiyon', 7]].forEach(function (x) {
      if (S[x[0]] && S[x[0]] !== 'Diğer' && adim > x[1]) ets.push([x[1], S[x[0]]]);
    });
    if (S.km && adim > 8) ets.push([8, new Intl.NumberFormat('tr-TR').format(S.km) + ' km']);
    if (adim >= ADIMLAR.length - 1) ets = [];
    $('#sbSecimler').innerHTML = ets.map(function (e) { return '<button data-a="' + e[0] + '">' + esc(e[1]) + ' ✎</button>'; }).join('');
    $('#sbSecimler').onclick = function (e) { var b = e.target.closest('button'); if (b) git(+b.dataset.a); };
  }

  var SIRA = ['marka', 'yil', 'model', 'kasa', 'yakit', 'vites', 'motor', 'versiyon'];
  function temizleSonra(alan) {
    var i = SIRA.indexOf(alan);
    if (i >= 0) { SIRA.slice(i + 1).forEach(function (k) { delete S[k]; if (k === 'motor') delete S.motorAd; }); if (i < 7) S.katalog_id = 0; }
  }
  function sec(alan, deger, otoIlerle) {
    S[alan] = deger;
    // üst seçim değişirse alt seçimleri temizle
    temizleSonra(alan);
    if (otoIlerle) setTimeout(function () { git(adim + 1); }, 120); else guncelleBtn();
  }

  function aramaListesi(kap, ogeler, alan, opts) {
    opts = opts || {};
    kap.innerHTML = (opts.ipucu ? '<p class="ipucu">' + opts.ipucu + '</p>' : '') +
      (ogeler.length > 12 ? '<input class="ara" placeholder="' + (opts.yer || 'Ara…') + '" autocomplete="off">' : '') +
      '<div class="' + (opts.liste ? 'liste' : 'izgara') + '" id="ogeler"></div>';
    var ara = $('.ara', kap), kut = $('#ogeler', kap);
    function ciz(q) {
      q = (q || '').toLocaleLowerCase('tr');
      var f = ogeler.filter(function (o) { return !q || o.ad.toLocaleLowerCase('tr').indexOf(q) >= 0; });
      kut.innerHTML = f.length ? f.map(function (o) {
        return '<button class="secenek' + (S[alan] === o.ad ? ' secili' : '') + '" data-v="' + esc(o.ad) + '">' + esc(o.ad) + (o.alt ? '<small>' + esc(o.alt) + '</small>' : '') + '</button>';
      }).join('') : '<div class="bos">Sonuç yok. ' + (opts.bosNot || '') + '</div>';
    }
    ciz('');
    if (ara) { ara.oninput = function () { ciz(ara.value); }; if (window.innerWidth > 980) ara.focus(); }
    kut.onclick = function (e) { var b = e.target.closest('.secenek'); if (!b) return; sec(alan, b.dataset.v, true); };
  }

  function cizMarka(k) {
    var go = function (l) {
      var pop = l.slice(0, 12), dig = l.slice(12).sort(function (a, b) { return a.ad.localeCompare(b.ad, 'tr'); });
      var hepsi = pop.concat(dig);
      k.innerHTML = '<p class="ipucu">En çok değerlenen markalar başta.</p><input class="ara" placeholder="Marka ara (ör. Renault)" autocomplete="off"><div class="izgara dort" id="ogeler"></div>';
      var kut = $('#ogeler', k), ara = $('.ara', k);
      var ciz = function (q) {
        q = (q || '').toLocaleLowerCase('tr');
        var f = hepsi.filter(function (o) { return !q || o.ad.toLocaleLowerCase('tr').indexOf(q) >= 0; });
        kut.innerHTML = f.length ? f.map(function (o) {
          return '<button class="secenek logo-kart' + (S.marka === o.ad ? ' secili' : '') + '" data-v="' + esc(o.ad) + '">' + (o.logo ? '<img src="' + esc(o.logo) + '" alt="" loading="lazy">' : '<span class="harf">' + esc(o.ad.charAt(0)) + '</span>') + '<span>' + esc(o.ad) + '</span></button>';
        }).join('') : '<div class="bos">Sonuç yok. Markanız listede yoksa bizi arayın.</div>';
      };
      ciz(''); ara.oninput = function () { ciz(ara.value); }; if (window.innerWidth > 980) ara.focus();
      kut.onclick = function (e) { var b = e.target.closest('.secenek'); if (b) sec('marka', b.dataset.v, true); };
    };
    if (cache.markalar) return go(cache.markalar);
    api('markalar').then(function (l) { cache.markalar = l; go(l); }).catch(hataGoster(k));
  }
  function cizYil(k) {
    api('markayillar', { marka: S.marka }).then(function (l) {
      k.innerHTML = '<div class="izgara dort" id="ogeler">' + l.map(function (y) { return '<button class="secenek' + (S.yil === y ? ' secili' : '') + '" data-v="' + y + '">' + y + '</button>'; }).join('') + '</div>';
      $('#ogeler', k).onclick = function (e) { var b = e.target.closest('.secenek'); if (b) sec('yil', +b.dataset.v, true); };
    }).catch(hataGoster(k));
  }
  function cizModel(k) {
    api('yilmodeller', { marka: S.marka, yil: S.yil }).then(function (l) {
      k.innerHTML = (l.length > 9 ? '<input class="ara" placeholder="' + esc(S.marka) + ' modeli ara" autocomplete="off">' : '') + '<div class="izgara" id="ogeler"></div>';
      var kut = $('#ogeler', k), ara = $('.ara', k);
      var ciz = function (q) {
        q = (q || '').toLocaleLowerCase('tr');
        var f = l.filter(function (o) { return !q || o.ad.toLocaleLowerCase('tr').indexOf(q) >= 0; });
        kut.innerHTML = f.length ? f.map(function (o) {
          return '<button class="secenek model-kart' + (S.model === o.ad ? ' secili' : '') + '" data-v="' + esc(o.ad) + '">' + (o.gorsel ? '<img src="' + esc(o.gorsel) + '" alt="" loading="lazy">' : silus(o.kasa)) + '<span>' + esc(o.ad) + '</span></button>';
        }).join('') : '<div class="bos">Bu yıl için model bulunamadı. Bizi arayın, değerlendirelim.</div>';
      };
      ciz(''); if (ara) { ara.oninput = function () { ciz(ara.value); }; if (window.innerWidth > 980) ara.focus(); }
      kut.onclick = function (e) { var b = e.target.closest('.secenek'); if (b) sec('model', b.dataset.v, true); };
    }).catch(hataGoster(k));
  }
  // marka/model/yıl için TSB versiyonları (bir kez çekilir)
  function secenekler() {
    var a = S.marka + '|' + S.model + '|' + S.yil;
    if (cache.sec && cache.sec.a === a) return Promise.resolve(cache.sec.l);
    return api('secenekler', { marka: S.marka, model: S.model, yil: S.yil }).then(function (l) { cache.sec = { a: a, l: l }; return l; });
  }
  var VARSAYILAN = { kasa: ['Sedan', 'Hatchback', 'SUV', 'Station Wagon', 'Coupe', 'Cabrio', 'MPV / Ticari', 'Pick-up'], yakit: ['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik'], vites: ['Manuel', 'Otomatik', 'Yarı Otomatik'] };
  function uygunlar(l, alan) {
    return l.filter(function (v) {
      return (alan === 'kasa' || !S.kasa || v.kasa === S.kasa) && (alan === 'kasa' || alan === 'yakit' || !S.yakit || v.yakit === S.yakit);
    });
  }
  function cizSecim(k, alan) {
    secenekler().then(function (l) {
      var liste;
      if (l.length) {
        var say = {}; uygunlar(l, alan).forEach(function (v) { say[v[alan]] = (say[v[alan]] || 0) + 1; });
        liste = Object.keys(say).sort(function (a, b) { return VARSAYILAN[alan].indexOf(a) - VARSAYILAN[alan].indexOf(b); });
      } else liste = VARSAYILAN[alan];
      // tek seçenek varsa otomatik geç
      if (liste.length === 1) { if (S[alan] !== liste[0]) { S[alan] = liste[0]; temizleSonra(alan); } git(adim + yon); return; }
      k.innerHTML = '<div class="izgara' + (alan === 'kasa' ? '' : '') + '" id="ogeler">' + liste.map(function (s) {
        return '<button class="secenek' + (alan === 'kasa' ? ' model-kart' : '') + (S[alan] === s ? ' secili' : '') + '" data-v="' + esc(s) + '">' + (alan === 'kasa' ? silus(s) : '') + '<span>' + esc(s) + '</span></button>';
      }).join('') + '</div>';
      $('#ogeler', k).onclick = function (e) { var b = e.target.closest('.secenek'); if (b) sec(alan, b.dataset.v, true); };
    }).catch(hataGoster(k));
  }
  // motor anahtarı: hacim + beygir (aynı motorun paketleri birlikte listelenir)
  function motorAnahtar(v) { return (v.motor || '') + '|' + (v.beygir || 0); }
  function motorEtiket(v) { var p = []; if (v.motor) p.push(v.motor); if (v.beygir) p.push(v.beygir + ' hp'); return p.join(' · ') || 'Diğer'; }
  function kasaYakitVites(tsb) {
    var l = tsb.filter(function (v) { return (!S.kasa || v.kasa === S.kasa) && (!S.yakit || v.yakit === S.yakit) && (!S.vites || v.vites === S.vites); });
    return l.length ? l : tsb;
  }
  function cizMotor(k) {
    secenekler().then(function (tsb) {
      if (!tsb.length) { S.motor = ''; S.motorAd = ''; git(adim + yon); return; }
      var gr = {}, sira = [];
      kasaYakitVites(tsb).forEach(function (v) { var a = motorAnahtar(v); if (!gr[a]) { gr[a] = { a: a, ad: motorEtiket(v), n: 0, hacim: parseFloat(v.motor) || 0, hp: v.beygir || 0 }; sira.push(gr[a]); } gr[a].n++; });
      sira.sort(function (x, y) { return x.hacim - y.hacim || x.hp - y.hp; });
      if (sira.length === 1) { if (S.motor !== sira[0].a) { S.motor = sira[0].a; S.motorAd = sira[0].ad === 'Diğer' ? '' : sira[0].ad; delete S.versiyon; S.katalog_id = 0; } git(adim + yon); return; }
      k.innerHTML = '<p class="ipucu">Ruhsatta yazan motor hacmi ve gücü. Bir sonraki adımda bu motorun paketleri gelecek.</p><div class="izgara iki" id="ogeler">' + sira.map(function (m) {
        return '<button class="secenek' + (S.motor === m.a ? ' secili' : '') + '" data-v="' + esc(m.a) + '" data-ad="' + esc(m.ad) + '">' + esc(m.ad) + '<small>' + m.n + ' paket</small></button>';
      }).join('') + '<button class="secenek" data-v="" data-ad="">Bilmiyorum<small>tüm paketleri göster</small></button></div>';
      $('#ogeler', k).onclick = function (e) {
        var b = e.target.closest('.secenek'); if (!b) return;
        if (S.motor !== b.dataset.v) { delete S.versiyon; S.katalog_id = 0; }
        S.motor = b.dataset.v; S.motorAd = b.dataset.ad === 'Diğer' ? '' : b.dataset.ad;
        setTimeout(function () { git(adim + 1); }, 120);
      };
    }).catch(hataGoster(k));
  }
  function cizVersiyon(k) {
    secenekler().then(function (tsb) {
      if (tsb.length) {
        var l = kasaYakitVites(tsb);
        if (S.motor) { var m = l.filter(function (v) { return motorAnahtar(v) === S.motor; }); if (m.length) l = m; }
        k.innerHTML = '<p class="ipucu">' + (S.motorAd ? esc(S.motorAd) + ' motorlu paketler. ' : '') + 'Ruhsatta veya satış belgesinde yazan donanım paketini seç.</p>' + (l.length > 10 ? '<input class="ara" placeholder="Paket ara" autocomplete="off">' : '') + '<div class="liste" id="ogeler"></div>';
        var kut = $('#ogeler', k), ara = $('.ara', k);
        var ciz = function (q) {
          q = (q || '').toLocaleLowerCase('tr');
          var f = l.filter(function (v) { return !q || v.ad.toLocaleLowerCase('tr').indexOf(q) >= 0; });
          kut.innerHTML = f.map(function (v) {
            var et = []; if (v.motor) et.push(v.motor); if (v.beygir) et.push(v.beygir + ' hp');
            return '<button class="secenek versiyon' + (S.katalog_id === v.id ? ' secili' : '') + '" data-id="' + v.id + '"><span>' + esc(v.ad) + '</span><small>' + et.map(function (x) { return '<i>' + esc(x) + '</i>'; }).join('') + '</small></button>';
          }).join('') + '<button class="secenek versiyon" data-id="0"><span>Listede yok / Bilmiyorum</span></button>';
        };
        ciz(''); if (ara) ara.oninput = function () { ciz(ara.value); };
        kut.onclick = function (e) {
          var b = e.target.closest('.secenek'); if (!b) return;
          var id = +b.dataset.id, v = l.find(function (x) { return x.id === id; });
          S.katalog_id = id || 0; S.versiyon = v ? v.ad : '';
          setTimeout(function () { git(adim + 1); }, 120);
        };
        return;
      }
      // katalog yoksa: ilanlardan toplanan versiyon adları
      api('versiyonlar', { marka: S.marka, model: S.model }).then(function (l) {
        if (!l.length) { S.versiyon = ''; S.katalog_id = 0; git(adim + yon); return; }
        var o = l.map(function (v) { return { ad: v }; }); o.push({ ad: 'Listede yok / Bilmiyorum' });
        aramaListesi(k, o, 'versiyon', { liste: true, yer: 'Paket ara', ipucu: 'Ruhsatta veya satış belgesinde yazan motor ve donanım paketi.' });
        $('#ogeler', k).onclick = function (e) { var b = e.target.closest('.secenek'); if (!b) return; S.katalog_id = 0; sec('versiyon', b.dataset.v === 'Listede yok / Bilmiyorum' ? '' : b.dataset.v, true); };
      });
    }).catch(hataGoster(k));
  }
  // kasa tipine göre basit yan görünüş çizimi (fotoğraf yoksa)
  function silus(kasa) {
    var g = {
      'Sedan': 'M8 58 L10 46 Q14 39 30 38 L56 35 L76 21 Q82 18 94 18 L126 18 Q136 18 144 25 L158 36 L182 39 Q192 41 192 50 L192 58 Z',
      'Hatchback': 'M8 58 L10 46 Q14 39 30 38 L58 35 L80 20 Q86 17 98 17 L150 17 Q160 17 166 27 L176 40 Q184 42 186 50 L186 58 Z',
      'SUV': 'M8 58 L8 42 Q10 33 26 32 L54 30 L72 14 Q76 11 86 11 L158 11 Q168 11 174 19 L186 33 Q192 35 192 45 L192 58 Z',
      'Station Wagon': 'M8 58 L10 46 Q14 39 30 38 L56 35 L76 20 Q82 17 94 17 L172 17 Q182 18 186 30 L190 42 L190 58 Z',
      'Coupe': 'M8 58 L10 47 Q14 41 32 40 L62 37 L88 23 Q94 21 104 21 L130 21 Q142 22 154 32 L182 40 Q192 42 192 51 L192 58 Z',
      'Cabrio': 'M8 58 L10 47 Q14 41 32 40 L66 37 L84 28 L90 37 L182 40 Q192 42 192 51 L192 58 Z',
      'MPV / Ticari': 'M8 58 L8 36 L30 13 Q34 10 44 10 L178 10 Q190 10 190 22 L190 58 Z',
      'Pick-up': 'M8 58 L8 42 Q10 34 26 33 L50 31 L66 15 Q70 12 80 12 L114 12 Q120 12 120 20 L120 36 L192 36 L192 58 Z'
    };
    var d = g[kasa] || g['Sedan'];
    return '<svg class="silus" viewBox="0 0 200 76" aria-hidden="true"><path d="' + d + '" fill="currentColor"/><circle cx="50" cy="60" r="12" fill="#2b3442"/><circle cx="50" cy="60" r="5" fill="#cfd6df"/><circle cx="152" cy="60" r="12" fill="#2b3442"/><circle cx="152" cy="60" r="5" fill="#cfd6df"/></svg>';
  }
  function cipGrubu(baslik, alan, secenekler, sinif) {
    return '<div class="grup"><label>' + baslik + '</label><div class="izgara ' + (sinif || '') + '" data-alan="' + alan + '">' +
      secenekler.map(function (s) { return '<button class="secenek' + (S[alan] === s ? ' secili' : '') + '" data-v="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div></div>';
  }
  function cipBagla(k) {
    k.querySelectorAll('[data-alan]').forEach(function (g) {
      g.onclick = function (e) {
        var b = e.target.closest('.secenek'); if (!b) return;
        g.querySelectorAll('.secenek').forEach(function (x) { x.classList.remove('secili'); });
        b.classList.add('secili'); S[g.dataset.alan] = b.dataset.v; guncelleBtn();
      };
    });
  }
  function cizKm(k) {
    k.innerHTML = '<div class="grup"><label>Kilometre</label><input class="alan buyuk" id="km" inputmode="numeric" placeholder="ör. 85.000" value="' + (S.km ? new Intl.NumberFormat('tr-TR').format(S.km) : '') + '">' +
      '<div class="km-not">Göstergede yazan güncel kilometre.</div></div>' +
      cipGrubu('Renk (isteğe bağlı)', 'renk', ['Beyaz', 'Siyah', 'Gri', 'Gümüş', 'Kırmızı', 'Mavi', 'Lacivert', 'Kahverengi', 'Diğer'], '');
    var i = $('#km', k);
    i.oninput = function () {
      var n = parseInt(i.value.replace(/\D/g, ''), 10) || 0;
      if (n > 2000000) n = 2000000;
      S.km = n; i.value = n ? new Intl.NumberFormat('tr-TR').format(n) : '';
      guncelleBtn();
    };
    i.onkeydown = function (e) { if (e.key === 'Enter') sonraki(); };
    if (window.innerWidth > 980) i.focus();
    cipBagla(k);
  }

  function aracSvg() {
    var p = function (id, d) { return '<path class="parca" data-p="' + id + '" d="' + d + '"><title>' + PAD[id] + '</title></path>'; };
    return '<svg class="arac-svg" viewBox="0 0 220 440" aria-label="Araç parça şeması">' +
      '<rect class="teker" x="4" y="78" width="14" height="52" rx="5"/><rect class="teker" x="202" y="78" width="14" height="52" rx="5"/>' +
      '<rect class="teker" x="4" y="318" width="14" height="52" rx="5"/><rect class="teker" x="202" y="318" width="14" height="52" rx="5"/>' +
      p('on_tampon', 'M40 30 Q110 4 180 30 L184 48 Q110 36 36 48 Z') +
      p('kaput', 'M52 54 Q110 44 168 54 L164 128 Q110 120 56 128 Z') +
      '<path class="cam" d="M58 134 Q110 126 162 134 L156 168 Q110 162 64 168 Z"/>' +
      p('tavan', 'M66 174 Q110 168 154 174 L154 280 Q110 286 66 280 Z') +
      '<path class="cam" d="M64 286 Q110 292 156 286 L160 314 Q110 322 60 314 Z"/>' +
      p('bagaj', 'M58 320 Q110 328 162 320 L166 382 Q110 392 54 382 Z') +
      p('arka_tampon', 'M36 392 Q110 404 184 392 L180 412 Q110 434 40 412 Z') +
      p('sol_on_camurluk', 'M22 54 L48 54 L52 130 L22 136 Z') +
      p('sol_on_kapi', 'M22 142 L56 136 L62 226 L22 226 Z') +
      p('sol_arka_kapi', 'M22 232 L62 232 L60 310 L22 310 Z') +
      p('sol_arka_camurluk', 'M22 316 L54 316 L50 386 L22 386 Z') +
      p('sag_on_camurluk', 'M198 54 L172 54 L168 130 L198 136 Z') +
      p('sag_on_kapi', 'M198 142 L164 136 L158 226 L198 226 Z') +
      p('sag_arka_kapi', 'M198 232 L158 232 L160 310 L198 310 Z') +
      p('sag_arka_camurluk', 'M198 316 L166 316 L170 386 L198 386 Z') +
      '<text x="110" y="24" text-anchor="middle" font-size="10" fill="#6b7280">ÖN</text>' +
      '</svg>';
  }
  function cizHasar(k) {
    k.innerHTML = '<p class="ipucu">Boyalı veya değişen parçaya dokun. Her dokunuşta durum sırayla değişir ve parçanın üstünde yazar.</p>' +
      '<div class="hasar-kap"><div>' + aracSvg() + '</div><div>' +
      '<div class="lejant"><span><i class="l-orijinal"></i>Orijinal</span><span><i class="l-lokal"></i>Lokal boyalı</span><span><i class="l-boyali"></i>Boyalı</span><span><i class="l-degisen"></i>Değişen</span></div>' +
      '<div class="parca-liste" id="parcaListe"></div>' +
      '<div class="grup"><label>Tramer (hasar) kaydı</label><div class="cift" data-ev="tramerVar"><button class="secenek" data-v="0">Yok</button><button class="secenek" data-v="1">Var</button></div>' +
      '<input class="alan" id="tramer" inputmode="numeric" placeholder="Toplam tramer tutarı (TL)" style="margin-top:8px;display:none"></div>' +
      '<div class="grup"><label>Ağır hasar kaydı</label><div class="cift" data-ev="agir"><button class="secenek" data-v="0">Yok</button><button class="secenek" data-v="1">Var</button></div></div>' +
      '</div></div>';
    var svg = $('.arac-svg', k), liste = $('#parcaListe', k), tr = $('#tramer', k);
    // her parçanın ortasına durum yazısı (dar yan parçalarda dikey)
    var KISA = { orijinal: 'ORİJİNAL', lokal: 'LOKAL', boyali: 'BOYALI', degisen: 'DEĞİŞEN' };
    var yazilar = {};
    svg.querySelectorAll('.parca').forEach(function (el) {
      var b; try { b = el.getBBox(); } catch (e) { return; }
      if (!b || !b.width) return;
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      var cx = b.x + b.width / 2, cy = b.y + b.height / 2, dik = b.height > b.width * 1.4;
      t.setAttribute('x', cx); t.setAttribute('y', cy); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
      if (dik) t.setAttribute('transform', 'rotate(-90 ' + cx + ' ' + cy + ')');
      t.setAttribute('class', 'parca-yazi');
      svg.appendChild(t); yazilar[el.dataset.p] = t;
    });
    function boya() {
      svg.querySelectorAll('.parca').forEach(function (el) {
        var d = S.hasar[el.dataset.p] || 'orijinal'; el.setAttribute('class', 'parca ' + d);
        var t = yazilar[el.dataset.p]; if (t) { t.textContent = KISA[d]; t.setAttribute('class', 'parca-yazi y-' + d); }
      });
      var ks = Object.keys(S.hasar);
      liste.innerHTML = ks.length ? ks.map(function (p) { return '<div><span>' + PAD[p] + '</span><b>' + DURUM_AD[S.hasar[p]] + '</b></div>'; }).join('') : '<div><span>Tüm parçalar orijinal</span><b>✓</b></div>';
    }
    svg.onclick = function (e) {
      var el = e.target.closest('.parca'); if (!el) return;
      var p = el.dataset.p, d = S.hasar[p] || 'orijinal', y = DURUM_SIRA[(DURUM_SIRA.indexOf(d) + 1) % 4];
      if (y === 'orijinal') delete S.hasar[p]; else S.hasar[p] = y;
      boya();
    };
    k.querySelectorAll('[data-ev]').forEach(function (g) {
      var alan = g.dataset.ev;
      var isaretle = function () { g.querySelectorAll('.secenek').forEach(function (b) { b.classList.toggle('secili', S[alan] !== null && +b.dataset.v === (S[alan] ? 1 : 0)); }); };
      g.onclick = function (e) {
        var b = e.target.closest('.secenek'); if (!b) return;
        S[alan] = b.dataset.v === '1';
        isaretle();
        if (alan === 'tramerVar') { tr.style.display = S.tramerVar ? '' : 'none'; if (S.tramerVar) tr.focus(); else S.tramer = 0; }
        guncelleBtn();
      };
      isaretle();
    });
    tr.style.display = S.tramerVar ? '' : 'none';
    if (S.tramer) tr.value = new Intl.NumberFormat('tr-TR').format(S.tramer);
    tr.oninput = function () { var n = parseInt(tr.value.replace(/\D/g, ''), 10) || 0; S.tramer = n; tr.value = n ? new Intl.NumberFormat('tr-TR').format(n) : ''; guncelleBtn(); };
    boya();
  }
  // donanım (sunroof vb.), açıklama ve en fazla 10 fotoğraf — hepsi isteğe bağlı
  var FOTO_MAX = 10;
  function donanimListesi() {
    var l = (firma.donanimlar || []);
    return l.filter(function (d) {
      var ko = String(d.kosul || '').trim().toLocaleLowerCase('tr');
      if (!ko) return true;
      if (ko === 'otomatik') return S.vites === 'Otomatik' || S.vites === 'Yarı Otomatik';
      return ko.split(',').map(function (x) { return x.trim(); }).indexOf(String(S.marka || '').toLocaleLowerCase('tr')) >= 0;
    });
  }
  function fotoKucult(dosya) {
    return new Promise(function (ok, red) {
      var img = new Image(), url = URL.createObjectURL(dosya);
      img.onload = function () {
        var en = 1600, o = Math.min(1, en / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * o); c.height = Math.round(img.height * o);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : red(new Error('Fotoğraf işlenemedi')); }, 'image/jpeg', 0.78);
      };
      img.onerror = function () { URL.revokeObjectURL(url); red(new Error(dosya.name + ' açılamadı')); };
      img.src = url;
    });
  }
  function cizEk(k) {
    S.donanim = S.donanim || []; S.fotolar = S.fotolar || [];
    var dl = donanimListesi();
    S.donanim = S.donanim.filter(function (x) { return dl.some(function (d) { return d.ad === x; }); });
    k.innerHTML = '<p class="ipucu">Bu adımdaki her şey isteğe bağlı. Doldurursan teklifimiz daha isabetli olur.</p>' +
      (dl.length ? '<div class="grup"><label>Aracında hangileri var?</label><div class="izgara iki" id="donanim">' + dl.map(function (d) {
        return '<button class="secenek kutucuk' + (S.donanim.indexOf(d.ad) >= 0 ? ' secili' : '') + '" data-v="' + esc(d.ad) + '"><i></i>' + esc(d.ad) + '</button>';
      }).join('') + '</div></div>' : '') +
      '<div class="grup"><label>Açıklama <small class="istege">isteğe bağlı</small></label><textarea class="alan" id="aciklama" rows="3" maxlength="1500" placeholder="Bakımları, ekstra donanımı, bilinen bir arızası vb. aklına gelen her şeyi yazabilirsin.">' + esc(S.aciklama || '') + '</textarea></div>' +
      '<div class="grup"><label>Fotoğraflar <small class="istege">isteğe bağlı · en fazla ' + FOTO_MAX + '</small></label>' +
      '<div class="foto-izgara" id="fotoIzgara"></div><input type="file" id="fotoDosya" accept="image/*" multiple hidden><div class="hata" id="fotoHata"></div></div>';
    var don = $('#donanim', k);
    if (don) don.onclick = function (e) {
      var b = e.target.closest('.secenek'); if (!b) return;
      var i = S.donanim.indexOf(b.dataset.v); if (i >= 0) S.donanim.splice(i, 1); else S.donanim.push(b.dataset.v);
      b.classList.toggle('secili', i < 0);
    };
    $('#aciklama', k).oninput = function (e) { S.aciklama = e.target.value; };
    var iz = $('#fotoIzgara', k), dosya = $('#fotoDosya', k), hata = $('#fotoHata', k);
    function ciz() {
      iz.innerHTML = S.fotolar.map(function (f, i) { return '<div class="foto"><img src="' + f.url + '" alt=""><button type="button" data-i="' + i + '" aria-label="Kaldır">✕</button></div>'; }).join('') +
        (S.fotolar.length < FOTO_MAX ? '<button type="button" class="foto-ekle" id="fotoEkle"><b>+</b><span>' + (S.fotolar.length ? 'Fotoğraf ekle' : 'Fotoğraf yükle') + '</span><small>' + S.fotolar.length + ' / ' + FOTO_MAX + '</small></button>' : '');
      var e = $('#fotoEkle', k); if (e) e.onclick = function () { dosya.click(); };
    }
    iz.onclick = function (e) { var b = e.target.closest('button[data-i]'); if (!b) return; var f = S.fotolar.splice(+b.dataset.i, 1)[0]; if (f) URL.revokeObjectURL(f.url); ciz(); };
    dosya.onchange = function () {
      var l = Array.prototype.slice.call(dosya.files || []).filter(function (f) { return /^image\//.test(f.type); });
      dosya.value = ''; hata.textContent = '';
      var yer = FOTO_MAX - S.fotolar.length;
      if (l.length > yer) { hata.textContent = 'En fazla ' + FOTO_MAX + ' fotoğraf ekleyebilirsin; ilk ' + yer + ' tanesi alındı.'; l = l.slice(0, yer); }
      var sir = Promise.resolve();
      l.forEach(function (f) { sir = sir.then(function () { return fotoKucult(f).then(function (b) { S.fotolar.push({ blob: b, url: URL.createObjectURL(b) }); ciz(); }).catch(function (er) { hata.textContent = er.message; }); }); });
    };
    ciz();
  }
  function fotolariGonder(no, anahtar, durum) {
    var l = (S.fotolar || []).slice(), i = 0, basarili = 0;
    if (!l.length) return Promise.resolve(0);
    var adim1 = function () {
      if (i >= l.length) return Promise.resolve(basarili);
      var fd = new FormData(); fd.append('no', no); fd.append('anahtar', anahtar); fd.append('dosya', l[i].blob, 'foto' + (i + 1) + '.jpg');
      if (durum) durum(i + 1, l.length);
      return fetch('api.php?a=foto', { method: 'POST', body: fd }).then(function (r) { if (r.ok) basarili++; }).catch(function () {}).then(function () { i++; return adim1(); });
    };
    return adim1();
  }
  function cizIletisim(k) {
    k.innerHTML = '<p class="ipucu">Ön teklifin hemen ekranda; uzmanımız ekspertiz randevusu için seni arayacak.</p>' +
      '<div class="grup"><label>Ad Soyad</label><input class="alan" id="ad" autocomplete="name" value="' + esc(S.ad || '') + '"></div>' +
      '<div class="grup"><label>Cep telefonu</label><input class="alan" id="tel" inputmode="tel" autocomplete="tel" placeholder="05xx xxx xx xx" value="' + esc(S.tel || '') + '"></div>' +
      '<div class="grup"><label>Aracın bulunduğu il</label><select class="alan" id="il">' + ILLER.map(function (i) { return '<option' + ((S.il || 'İstanbul') === i ? ' selected' : '') + '>' + i + '</option>'; }).join('') + '</select></div>' +
      '<label class="onay"><input type="checkbox" id="kvkk"' + (S.kvkk ? ' checked' : '') + '> Bilgilerimin teklif ve randevu için kullanılmasını ve benimle telefonla/WhatsApp ile iletişime geçilmesini kabul ediyorum.</label>' +
      '<div class="hata" id="hata"></div>';
    S.il = S.il || 'İstanbul';
    $('#ad', k).oninput = function (e) { S.ad = e.target.value; guncelleBtn(); };
    $('#tel', k).oninput = function (e) { S.tel = e.target.value; guncelleBtn(); };
    $('#il', k).onchange = function (e) { S.il = e.target.value; };
    $('#kvkk', k).onchange = function (e) { S.kvkk = e.target.checked; guncelleBtn(); };
  }

  var sonuc = null;
  function gonder() {
    btnI.disabled = true; btnI.textContent = 'Hesaplanıyor…';
    var g = { ad: S.ad, tel: S.tel, il: S.il, marka: S.marka, model: S.model, yil: S.yil, versiyon: S.versiyon || '', katalog_id: S.katalog_id || 0, yakit: S.yakit, vites: S.vites, kasa: S.kasa || '', km: S.km, renk: S.renk || '', hasar: S.hasar, tramer: S.tramerVar ? S.tramer : 0, agir: !!S.agir, donanim: S.donanim || [], aciklama: S.aciklama || '' };
    api('teklif', null, g).then(function (s) { sonuc = s; git(ADIMLAR.length - 1); })
      .catch(function (e) { var h = $('#hata'); if (h) h.textContent = e.message; btnI.textContent = 'Teklifimi göster →'; guncelleBtn(); });
  }
  function cizSonuc(k) {
    var s = sonuc || {}, arac = S.yil + ' ' + S.marka + ' ' + S.model + (S.versiyon ? ' ' + S.versiyon : '');
    var fiyatli = s.durum === 'ok' && s.min > 0;
    var ust = fiyatli
      ? '<div class="rozet">✓ Ön teklifin hazır</div><div class="arac">' + esc(arac) + '</div><div class="rakam">' + tl(s.min) + '<span>–</span>' + tl(s.max) + '</div>' +
        '<div class="not">Bu teklif verdiğin bilgilere ve güncel piyasa verisine dayanır. Ücretsiz ekspertizden sonra kesin fiyatı veriyoruz. Talep no: <b>#' + s.no + '</b></div>'
      : '<div class="rozet">✓ Talebin alındı</div><div class="arac">' + esc(arac) + '</div><div class="not">' + esc(s.mesaj || 'Uzmanımız kısa süre içinde seni arayacak.') + ' Talep no: <b>#' + s.no + '</b></div>';
    var waMetin = encodeURIComponent('Merhaba, ' + arac + ' (' + new Intl.NumberFormat('tr-TR').format(S.km) + ' km) için ön teklif aldım' + (fiyatli ? ': ' + tl(s.min) + ' – ' + tl(s.max) : '') + '. Talep no: ' + (s.no || '') + '. Ekspertiz randevusu almak istiyorum.');
    var wa = firma.whatsapp ? '<a class="btn-wa" target="_blank" rel="noopener" href="https://wa.me/' + firma.whatsapp.replace(/\D/g, '') + '?text=' + waMetin + '">WhatsApp\'tan yaz</a>' : '';
    var ara = firma.telefon ? '<a class="btn-ara" href="tel:' + firma.telefon.replace(/[^\d+]/g, '') + '">Hemen ara</a>' : '';
    k.innerHTML = '<div class="sonuc">' + ust +
      '<div class="butonlar">' + wa + ara + '<button class="btn-yeni" id="yeni">Başka araç değerle</button></div>' +
      '<div id="randevuKutu"><button class="btn-randevu" id="randevu">📅 RANDEVU AL</button>' + (fiyatli ? '<div class="randevu-alt">Teklifi uygun bulduysan tıkla, seni arayalım.</div>' : '') + '</div>' +
      ((S.fotolar || []).length ? '<div class="foto-durum" id="fotoDurum">Fotoğraflar gönderiliyor…</div>' : '') + '</div>';
    if ((S.fotolar || []).length && !s.fotoGitti) {
      s.fotoGitti = true;
      fotolariGonder(s.no, s.anahtar, function (i, n) { var d = $('#fotoDurum'); if (d) d.textContent = 'Fotoğraflar gönderiliyor… ' + i + ' / ' + n; })
        .then(function (n) { var d = $('#fotoDurum'); if (d) { d.textContent = n ? '✓ ' + n + ' fotoğraf talebine eklendi.' : 'Fotoğraflar gönderilemedi; WhatsApp\'tan iletebilirsin.'; d.classList.add(n ? 'tamam' : 'olmadi'); } });
    }
    $('#randevu', k).onclick = function () {
      var b = this; b.disabled = true; b.textContent = 'Gönderiliyor…';
      api('randevu', null, { no: s.no, anahtar: s.anahtar }).then(function () {
        $('#randevuKutu', k).innerHTML = '<div class="randevu-ok"><div class="randevu-ikon">✓</div><b>Randevu talebin bize ulaştı</b>' +
          '<p>Teklifimize güvendiğin için teşekkür ederiz. Uzmanımız <b>en kısa sürede</b> seni arayarak ekspertiz ve ödeme için sana en uygun saati planlayacak.</p>' +
          (firma.telefon ? '<p class="kucuk-not">Beklemek istemezsen: <a href="tel:' + firma.telefon.replace(/[^\d+]/g, '') + '">' + esc(firma.telefon) + '</a></p>' : '') + '</div>';
        var kutu = $('#randevuKutu', k); if (kutu && kutu.scrollIntoView) kutu.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }).catch(function (e) { b.disabled = false; b.textContent = '📅 RANDEVU AL'; alert(e.message); });
    };
    $('#yeni', k).onclick = function () { var ad = S.ad, tel = S.tel, il = S.il, kvkk = S.kvkk; S = { hasar: {}, tramerVar: null, agir: null, ad: ad, tel: tel, il: il, kvkk: kvkk }; sonuc = null; git(0); };
  }
  function hataGoster(k) { return function (e) { k.innerHTML = '<div class="bos">Bağlantı hatası: ' + esc(e.message) + '</div>'; }; }

  // firma bilgileri
  api('firma').then(function (f) {
    firma = f;
    document.querySelectorAll('#altFirma').forEach(function (e) { e.textContent = f.ad; });
    if ($('#firmaAlt')) $('#firmaAlt').textContent = f.alt || '';
    $('#altAdres').textContent = f.adres || '';
    if (f.telefon) { var t = $('#ustTel'); t.hidden = false; t.href = 'tel:' + f.telefon.replace(/[^\d+]/g, ''); $('span', t).textContent = f.telefon; $('#altTel').textContent = '☎ ' + f.telefon; }
    if (f.whatsapp) { var w = $('#waSabit'); w.hidden = false; w.href = 'https://wa.me/' + f.whatsapp.replace(/\D/g, ''); }
    document.dispatchEvent(new CustomEvent('otk:firma', { detail: f }));
  }).catch(function () {});
  api('markalar').then(function (l) {
    cache.markalar = l;
    var n = l.reduce(function (a, b) { return a + b.n; }, 0);
    if (n > 1000) $('#ilanSayi').textContent = new Intl.NumberFormat('tr-TR').format(Math.floor(n / 1000) * 1000) + '+';
    document.dispatchEvent(new CustomEvent('otk:markalar', { detail: l }));
  }).catch(function () {});
  // ana sayfadaki marka kartlarından sihirbazı başlatmak için
  window.OTK = {
    basla: function () {
      var sb = $('#sihirbaz');
      sb.scrollIntoView({ behavior: 'smooth', block: window.innerWidth < 980 ? 'start' : 'center' });
      sb.classList.remove('vurgula'); void sb.offsetWidth; sb.classList.add('vurgula');
      if (adim === 0) { var a = $('.ara', sb); if (a) setTimeout(function () { a.focus({ preventScroll: true }); }, 450); }
    },
    marka: function (m) {
      if (adim !== 0) { S = { hasar: {}, tramerVar: null, agir: null, ad: S.ad, tel: S.tel, il: S.il, kvkk: S.kvkk }; sonuc = null; git(0); }
      sec('marka', m, true);
      $('#sihirbaz').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  git(0);
})();
