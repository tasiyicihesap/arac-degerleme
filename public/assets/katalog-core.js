/* OTOKABUL — TSB kasko listesi okuyucu ve tip adı ayrıştırıcı
   Tarayıcıda (yönetim paneli) ve Node'da (test / başlangıç verisi) çalışır. */
(function (root) {
  'use strict';
  var RC = root.RobotCore || (typeof require !== 'undefined' ? require('./robot-core.js') : null);

  var TR_UP = { 'i': 'İ', 'ı': 'I' };
  function upTR(s) { return String(s || '').replace(/[iı]/g, function (c) { return TR_UP[c]; }).toUpperCase(); }
  function fold(s) {
    return String(s || '').replace(/[İIı]/g, function (c) { return c === 'İ' ? 'i' : 'i'; }).toLowerCase()
      .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }
  function tutar(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    var t = String(v).replace(/[^\d.,-]/g, '');
    if (!t) return 0;
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    else if (/\.\d{3}(\.|$)/.test(t)) t = t.replace(/\./g, '');
    var n = parseFloat(t); return isNaN(n) ? 0 : n;
  }

  // ---------- Excel satırlarından ham kayıt ----------
  // İki düzeni de tanır: (a) yıl sütunları (2026, 2025, …) (b) "Model Yılı" + "Kasko Bedeli" satırları
  function satirlariOku(rows, varsayilanYil) {
    var bas = -1, map = {}, yilSut = {};
    for (var i = 0; i < Math.min(rows.length, 30) && bas < 0; i++) {
      var r = rows[i] || [], m = {}, ys = {};
      for (var j = 0; j < r.length; j++) {
        var h = fold(r[j]);
        if (!h) continue;
        if (/^(19|20)\d\d$/.test(h)) { ys[j] = +h; continue; }
        if (/marka/.test(h) && /(model|tip)/.test(h)) m.birlesik = j;
        else if (/marka ?kod/.test(h)) m.markaKodu = j;
        else if (/(tip|model) ?kod/.test(h)) m.tipKodu = j;
        else if (/(model )?yil/.test(h) && !/kasko/.test(h)) m.yil = j;
        else if (/marka/.test(h)) m.marka = j;
        else if (/(tip|model|arac)/.test(h)) m.tip = j;
        else if (/(kasko|bedel|deger|tutar)/.test(h)) m.deger = j;
      }
      var yilSay = Object.keys(ys).length;
      if ((m.marka !== undefined || m.birlesik !== undefined) && (m.tip !== undefined || m.birlesik !== undefined) && (m.deger !== undefined || yilSay >= 2)) {
        bas = i; map = m; yilSut = ys;
      }
    }
    if (bas < 0) throw new Error('Excel içinde Marka / Tip / Değer başlıkları bulunamadı. Doğru TSB kasko listesi mi?');
    var out = [], sonMarka = '';
    for (var k = bas + 1; k < rows.length; k++) {
      var s = rows[k] || [];
      var marka, tip;
      if (map.birlesik !== undefined) {
        var t = String(s[map.birlesik] || '').trim(), p = t.indexOf('-');
        if (p > 0) { marka = t.slice(0, p).trim(); tip = t.slice(p + 1).trim(); } else { marka = sonMarka; tip = t; }
      } else { marka = String(s[map.marka] == null ? '' : s[map.marka]).trim() || sonMarka; tip = String(s[map.tip] == null ? '' : s[map.tip]).trim(); }
      if (!marka || !tip) continue;
      sonMarka = marka;
      var kod = (map.markaKodu !== undefined ? s[map.markaKodu] : '') + '-' + (map.tipKodu !== undefined ? s[map.tipKodu] : '');
      var degerler = {};
      if (Object.keys(yilSut).length) Object.keys(yilSut).forEach(function (c) { var d = tutar(s[c]); if (d > 0) degerler[yilSut[c]] = d; });
      else { var y = map.yil !== undefined ? parseInt(s[map.yil], 10) : varsayilanYil; var d2 = tutar(s[map.deger]); if (y && d2 > 0) degerler[y] = d2; }
      if (Object.keys(degerler).length) out.push({ marka: marka, tip: tip, kod: kod, degerler: degerler });
    }
    return out;
  }

  // ---------- marka / model / versiyon ----------
  var MARKA_OZEL = { 'mercedes': 'Mercedes-Benz', 'mercedes benz': 'Mercedes-Benz', 'ssangyong': 'KGM', 'kgm ssangyong': 'KGM', 'tofas': 'Tofaş', 'tofas fiat': 'Tofaş', 'land rover': 'Land Rover', 'ds': 'DS Automobiles', 'mini': 'MINI', 'alfa romeo': 'Alfa Romeo' };
  function markaAdi(m) {
    var f = fold(m).replace(/-/g, ' ');
    if (MARKA_OZEL[f]) return MARKA_OZEL[f];
    if (RC) { var s = RC.slug(m); if (RC.BRANDS[s]) return RC.BRANDS[s]; }
    return String(m).toLowerCase().replace(/(^|[\s-])(\S)/g, function (a, b, c) { return b + upTR(c); });
  }
  // iki kelimelik model adları
  var IKILI = /^(GRAND|RANGE|MODEL|DISCOVERY|TRANSIT|TOURNEO|NEW|LAND|SANTA|SPACE|PROACE|DOBLO|FIORINO|SCENIC|GRANDE|PUNTO|CITY|C|E|T|X|ID|ID\.|E-TECH)$/;
  var UCLU = /^(RANGE ROVER)$/;
  function bas(s) { return s.charAt(0) + s.slice(1).toLowerCase(); }
  function modelGoster(tokenlar) {
    // "C-ELYSEE" -> "C-Elysee", "I20" -> "i20", "X-TRAIL" -> "X-Trail", "500X" -> "500X"
    return tokenlar.map(function (t) {
      if (/^I\d/.test(t)) return 'i' + t.slice(1);
      if (/^\d/.test(t) || t.length <= 3 && /\d/.test(t)) return t;
      if (/^[A-Z]{1,3}\d/.test(t)) return t;
      return t.split('-').map(function (p) { return p.length <= 2 && !/^(UP|ID)$/.test(p) ? p : bas(p); }).join('-');
    }).join(' ');
  }
  // site modelleri (robot) ile eşleştirme: marka -> [{slug, ad}] uzun olan önce
  function modelSozlugu(liste) {
    var d = {};
    (liste || []).forEach(function (x) { (d[x.marka] = d[x.marka] || []).push({ slug: RC.slug(x.model), ad: x.model }); });
    Object.keys(d).forEach(function (m) { d[m].sort(function (a, b) { return b.slug.length - a.slug.length; }); });
    return d;
  }
  function modelAyir(marka, tip, sozluk, takma) {
    var T = upTR(tip).replace(/\s+/g, ' ').trim();
    var sl = RC.slug(T);
    // 1) elle tanımlı eşleştirme (panel): "BMW|320" -> "3 Serisi"
    var tk = (takma || {})[marka] || [];
    for (var i = 0; i < tk.length; i++) if (sl === tk[i].slug || sl.indexOf(tk[i].slug + '-') === 0) return { model: tk[i].ad, versiyon: T.slice(tk[i].uzunluk).trim() || T };
    // 2) marka kuralları
    var tok = T.split(' ');
    if (marka === 'BMW') {
      var b = /^(\d)(\d\d)([A-Z]*)$/.exec(tok[0]);
      if (b) return { model: b[1] + ' Serisi', versiyon: T };
      var b2 = /^([XZMI]\d)\b/.exec(tok[0]); if (b2) return { model: b2[1], versiyon: tok.slice(1).join(' ') || T };
    }
    if (marka === 'Mercedes-Benz') {
      var m = /^(A|B|C|E|S|G|V)$/.exec(tok[0]); if (m && /^\d/.test(tok[1] || '')) return { model: m[1] + ' Serisi', versiyon: tok.slice(1).join(' ') };
      var m2 = /^(A|B|C|E|S|G|V)(\d{3})/.exec(tok[0]); if (m2) return { model: m2[1] + ' Serisi', versiyon: T };
      var m3 = /^(CLA|CLS|CLK|SLK|SLC|SL|GLA|GLB|GLC|GLE|GLS|GLK|ML|EQA|EQB|EQC|EQE|EQS|AMG GT|VITO|SPRINTER|CITAN|X)$/.exec(tok[0]); if (m3) return { model: m3[1], versiyon: tok.slice(1).join(' ') || T };
    }
    // 3) sitedeki (ilan) model adlarıyla en uzun önek eşleşmesi
    var l = (sozluk || {})[marka] || [];
    for (var j = 0; j < l.length; j++) {
      var s = l[j].slug;
      if (sl === s || sl.indexOf(s + '-') === 0) {
        // önekin T içindeki karşılığını kes
        var parca = s.split('-').length, kalan = tok.slice(parca).join(' ');
        // "C-ELYSEE" tek token ama slug iki parça olabilir
        if (RC.slug(tok.slice(0, parca).join(' ')) !== s) { var n = 1; while (n < tok.length && RC.slug(tok.slice(0, n).join(' ')) !== s) n++; kalan = tok.slice(n).join(' '); }
        return { model: l[j].ad, versiyon: kalan || T };
      }
    }
    // 4) sezgisel: ilk kelime (gerekiyorsa iki)
    var adet = UCLU.test(tok.slice(0, 2).join(' ')) ? 3 : (IKILI.test(tok[0]) && tok.length > 2 ? 2 : 1);
    return { model: modelGoster(tok.slice(0, adet)), versiyon: tok.slice(adet).join(' ') || T };
  }

  // ---------- teknik özellikler ----------
  var SUV = /^(X[1-7]|Q[2-8]|Q[2-8] SPORTBACK|GLA|GLB|GLC|GLE|GLS|GLK|ML|EQA|EQB|EQC|TIGUAN|T-ROC|T-CROSS|TAIGO|TOUAREG|ID\.4|ID\.5|KUGA|PUMA|ECOSPORT|EXPLORER|DUSTER|BIGSTER|QASHQAI|JUKE|X-TRAIL|ARIYA|TUCSON|KONA|BAYON|SANTA FE|IX35|SPORTAGE|STONIC|SORENTO|NIRO|EV6|XCEED|C-HR|RAV4|LAND CRUISER|YARIS CROSS|COROLLA CROSS|HIGHLANDER|2008|3008|5008|4008|CAPTUR|KADJAR|AUSTRAL|ARKANA|KOLEOS|SYMBIOZ|RAFALE|ATECA|ARONA|TARRACO|FORMENTOR|KAROQ|KODIAQ|KAMIQ|ELROQ|ENYAQ|RENEGADE|COMPASS|CHEROKEE|GRAND CHEROKEE|WRANGLER|AVENGER|CR-V|HR-V|ZR-V|VITARA|S-CROSS|JIMNY|MOKKA|GRANDLAND|CROSSLAND|FRONTERA|COUNTRYMAN|TONALE|STELVIO|T10X|T10F|ATTO 3|SEAL U|SEALION|TANG|TIGGO|OMODA|J7|J5|MODEL Y|MODEL X|RANGE ROVER|RANGE ROVER SPORT|RANGE ROVER EVOQUE|RANGE ROVER VELAR|DISCOVERY|DISCOVERY SPORT|DEFENDER|MACAN|CAYENNE|XC40|XC60|XC90|EX30|EX90|C40|CX-3|CX-30|CX-5|CX-60|NX|RX|UX|ES|TORRES|KORANDO|TIVOLI|REXTON|ZS|HS|EHS|MARVEL R|ASX|ECLIPSE CROSS|OUTLANDER|FORESTER|OUTBACK|XV|C3 AIRCROSS|C5 AIRCROSS|C4 X|DS 7|DS7|DS 3 CROSSBACK|500X|DOBLO CROSS|EGEA CROSS|TOPOLINO|C10|T03|B10|GEOMETRY|COOL|EX5|E5)$/;
  function ozellik(marka, model, versiyon) {
    var V = ' ' + upTR(model + ' ' + versiyon).replace(/[(),]/g, ' ') + ' ';
    var yakit = 'Benzin';
    if (/ (ELEKTR[İI]K|EV|BEV|ELECTRIC|E-TECH ELECTRIC|KWH|EQ[ABCSE]|ID\.\d|T10X|T10F|ATTO|SEAL|DOLPHIN|MODEL [3SXY]|IONIQ 5|IONIQ 6|EV\d|ARIYA|LEAF|ZOE|E-208|E-2008|E-C4|ENYAQ|ELROQ|EX30|C10|T03|B10|MEGANE E-TECH|SCENIC E-TECH|R5) /.test(V)) yakit = 'Elektrik';
    else if (/ (HYBRID|HİBR[İI]T|HIBRIT|HEV|PHEV|MHEV|E-TECH|HSD|E-HYBRID|PLUG-IN|SELF-CHARGING|FULL HYBRID|TFSIE|TFSI E|E-POWER) /.test(V)) yakit = 'Hibrit';
    else if (/ LPG /.test(V)) yakit = 'LPG';
    else if (/ (D[İI]ZEL|DIESEL|TDI|CDI|DCI|DCİ|CRDI|CRDİ|HDI|BLUEHDI|E-HDI|MULTIJET|MJET|M-JET|JTD|JTDM|TDCI|TDCİ|D-4D|DID|DI-D|CRD|SDV\d|TD\d|D\d|\d{3}D|\d{2,3} D|SKYACTIV-D|ECOBLUE|I-DTEC|DTEC|DDIS|D|CDTI|CDTİ|DTI|TDV\d|SD\d|BLUETEC|XDI|E-D) /.test(V)) yakit = 'Dizel';
    var vites = 'Manuel';
    if (yakit === 'Elektrik' || yakit === 'Hibrit' && !/ (MANUEL|MT) /.test(V)) vites = 'Otomatik';
    if (/ (OTOMAT[İI]K|OTOM\.?|OTM|AT|A\/T|DSG|S-TRONIC|STRONIC|S TRONIC|TIPTRONIC|STEPTRONIC|EDC|EAT\d?|DCT|DCT\d|7DCT|8DCT|CVT|X-TRONIC|XTRONIC|POWERSHIFT|MULTIDRIVE|AUTO|AUTOMATIC|9G|7G|9G-TRONIC|7G-TRONIC|G-TRONIC|SPEEDSHIFT|PDK|SPORTMATIC|GEARTRONIC|DKG|IVT|E-CVT|ECVT|DDCT|AISIN|TCT|DHT|A\d|\d AT|8AT|6AT|7AT|STEPTRONİC) /.test(V)) vites = 'Otomatik';
    else if (/ (DUALOGIC|AMT|ASG|EGS|ROBOT|EASYTRONIC|MMT|ETG|SELESPEED|SENSODRIVE|2-TRONIC|EASY-R|QUICKSHIFT|AGS|SMG|R-TRONIC) /.test(V)) vites = 'Yarı Otomatik';
    var kasa = '';
    var M = upTR(model);
    if (/ (PICK-UP|PICKUP|PICK UP|DOUBLE CAB|DOUBLECAB|ÇİFT KAB[İI]N|CIFT KABIN|TEK KAB[İI]N|D-CAB|4X4 DC|CREW CAB|KING CAB|HILUX|RANGER|AMAROK|NAVARA|L200|D-MAX|FULLBACK|MUSSO|ACTYON SPORTS|CORDOBA|NEW TORRES) /.test(V)) kasa = 'Pick-up';
    else if (/ (PANELVAN|PANEL VAN|VAN|CARGO|FURGON|KAMYONET|M[İI]N[İI]B[ÜU]S|MINIBUS|KOMB[İI]|COMBI|KOMBI|TRANSIT|TOURNEO|VITO|SPRINTER|CRAFTER|CARAVELLE|TRANSPORTER|MULTIVAN|DOBLO|FIORINO|PARTNER|RIFTER|BERLINGO|CADDY|KANGOO|CONNECT|COURIER|COMBO|TRAFIC|MASTER|JUMPY|JUMPER|BOXER|DUCATO|SCUDO|PROACE|EXPERT|STARIA|H-1|H350|CITAN|NV200|NV300|NV400|STAREX|DOKKER|LODGY|PREGIO|SPACE STAR|SHARAN|ALHAMBRA|TOURAN|ZAFIRA|GALAXY|S-MAX|C-MAX|ESPACE|GRAND SCENIC|5008|CARNIVAL|VOYAGER|ODYSSEY|SERENA|VERSO|PREVIA|ID\. BUZZ|ID\.BUZZ|EQV|V-CLASS) /.test(V) || /^V Serisi$/.test(model)) kasa = 'MPV / Ticari';
    else if (/ (CABR[İI]O|CABRIOLET|CONVERTIBLE|ROADSTER|SPIDER|SPYDER|VOLANTE) /.test(V)) kasa = 'Cabrio';
    else if (/ (COUPE|COUPÉ|KUPE|GRAN COUPE|GRANCOUPE) /.test(V)) kasa = 'Coupe';
    else if (/ (SW|STATION|STATION WAGON|WAGON|TOURER|SPORTS TOURER|AVANT|ESTATE|VARIANT|KOMBİ|BREAK|SPORTSWAGON|TOURING|SPORTBRAKE|SHOOTING BRAKE|ST|CROSS COUNTRY|ALLROAD|ALLTRACK|SPACETOURER|ALLSTREET) /.test(V)) kasa = 'Station Wagon';
    else if (SUV.test(M) || / (SUV|4X4|4WD|AWD QUATTRO|CROSS) /.test(V) && !/ (SEDAN|HB) /.test(V)) kasa = 'SUV';
    else if (/ (SEDAN|SD|SALOON|LIMOUSINE|LIMUZIN|NOTCHBACK|4 KAPI|4K) /.test(V)) kasa = 'Sedan';
    else if (/ (HB|HATCHBACK|HATCH|SPORTBACK|5 KAPI|3 KAPI|5K|3K|5D|3D|LIFTBACK|FASTBACK) /.test(V)) kasa = 'Hatchback';
    var mm = /(?:^|\s)(\d[.,]\d{1,2})(?=\s|[A-Z]|$)/.exec(' ' + upTR(versiyon));
    var motor = mm ? mm[1].replace(',', '.').slice(0, 3) : '';
    // beygir: versiyon içindeki 60–800 arası yalın sayı (HP/PS/BG ile birlikte olanlar öncelikli), kW ise çevir
    var beygir = 0, vt = upTR(versiyon).replace(/[(),]/g, ' ').split(/\s+/).filter(Boolean);
    for (var i = 0; i < vt.length; i++) {
      var t = vt[i], s = vt[i + 1] || '';
      var hp = /^(\d{2,3})(HP|PS|BG|CV)$/.exec(t);
      if (hp) { beygir = +hp[1]; break; }
      if (/^\d{2,3}$/.test(t)) {
        var n = +t;
        if (/^KW$/.test(s)) { beygir = Math.round(n * 1.36); break; }
        if (/^(HP|PS|BG|CV|BEYG[İI]R)$/.test(s)) { beygir = n; break; }
        if (n >= 60 && n <= 800 && !(i === 0 && (marka === 'Mercedes-Benz' || marka === 'Audi' || marka === 'Volvo'))) beygir = beygir || n;
      }
    }
    return { kasa: kasa, yakit: yakit, vites: vites, motor: motor, beygir: beygir };
  }
  function versiyonGoster(v) {
    return upTR(v).split(' ').map(function (t) {
      if (/\d/.test(t) || t.length <= 3) return t;
      if (/^(TDI|TSI|TFSI|DCI|HDI|CDI|CRDI|TCE|MPI|GDI|TGDI|VTEC|CVT|DSG|EDC|EAT\d|DCT|AMG|GT|GTI|GTD|RS|ST|SE|SEL|SX|LX|EX|XL|HEV|PHEV|AWD|4WD|4X4|STRONIC|BLUEHDI|PURETECH|ECOBOOST|SKYACTIV|QUATTRO|XDRIVE|4MATIC|LINE|N|R)$/.test(t)) return t;
      return t.charAt(0) + t.slice(1).replace(/İ/g, 'i').toLowerCase();
    }).join(' ');
  }

  // ---------- hepsini birleştir ----------
  function katalogOlustur(ham, siteModelleri, takmaListesi) {
    var soz = modelSozlugu(siteModelleri);
    var takma = {};
    (takmaListesi || []).forEach(function (t) {
      var s = RC.slug(t.tsb); (takma[t.marka] = takma[t.marka] || []).push({ slug: s, ad: t.model, uzunluk: upTR(t.tsb).trim().length });
    });
    Object.keys(takma).forEach(function (m) { takma[m].sort(function (a, b) { return b.slug.length - a.slug.length; }); });
    var cikti = [], gor = {};
    ham.forEach(function (h) {
      var marka = markaAdi(h.marka);
      var ma = modelAyir(marka, h.tip, soz, takma);
      var oz = ozellik(marka, ma.model, ma.versiyon);
      var anahtar = marka + '|' + ma.model + '|' + h.tip;
      if (gor[anahtar]) { Object.assign(gor[anahtar].degerler, h.degerler); return; }
      var k = { marka: marka, model: ma.model, versiyon: versiyonGoster(ma.versiyon), tip: upTR(h.tip), kod: h.kod, kasa: oz.kasa, yakit: oz.yakit, vites: oz.vites, motor: oz.motor, beygir: oz.beygir, degerler: h.degerler };
      gor[anahtar] = k; cikti.push(k);
    });
    return cikti;
  }

  var api = { satirlariOku: satirlariOku, katalogOlustur: katalogOlustur, ozellik: ozellik, modelAyir: modelAyir, modelSozlugu: modelSozlugu, markaAdi: markaAdi, tutar: tutar, upTR: upTR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KatalogCore = api;
})(this);
