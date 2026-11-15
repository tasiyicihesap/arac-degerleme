/* OTOKABUL Fiyat Robotu — çekirdek ayrıştırıcı ve piyasa hesaplayıcı
   Hem tarayıcıda (yönetim paneli) hem Node'da (başlangıç verisi) çalışır. */
(function (root) {
  'use strict';

  // slug -> görünen ad (uzun olanlar önce eşleşsin diye sıralanır)
  var BRANDS = {
    'alfa-romeo': 'Alfa Romeo', 'aston-martin': 'Aston Martin', 'audi': 'Audi', 'bentley': 'Bentley',
    'bmw': 'BMW', 'byd': 'BYD', 'cadillac': 'Cadillac', 'chery': 'Chery', 'chevrolet': 'Chevrolet',
    'chrysler': 'Chrysler', 'citroen': 'Citroen', 'cupra': 'Cupra', 'dacia': 'Dacia', 'daewoo': 'Daewoo',
    'daihatsu': 'Daihatsu', 'dodge': 'Dodge', 'ds-automobiles': 'DS Automobiles', 'ds': 'DS Automobiles',
    'ferrari': 'Ferrari', 'fiat': 'Fiat', 'ford': 'Ford', 'geely': 'Geely', 'honda': 'Honda',
    'hyundai': 'Hyundai', 'infiniti': 'Infiniti', 'isuzu': 'Isuzu', 'jaguar': 'Jaguar', 'jeep': 'Jeep',
    'kia': 'Kia', 'kgm': 'KGM', 'ssangyong': 'KGM', 'lada': 'Lada', 'lamborghini': 'Lamborghini',
    'lancia': 'Lancia', 'land-rover': 'Land Rover', 'leapmotor': 'Leapmotor', 'lexus': 'Lexus',
    'lincoln': 'Lincoln', 'maserati': 'Maserati', 'mazda': 'Mazda', 'mercedes-benz': 'Mercedes-Benz',
    'mercedes': 'Mercedes-Benz', 'mg': 'MG', 'mini': 'MINI', 'mitsubishi': 'Mitsubishi', 'nissan': 'Nissan',
    'opel': 'Opel', 'peugeot': 'Peugeot', 'porsche': 'Porsche', 'proton': 'Proton', 'renault': 'Renault',
    'rolls-royce': 'Rolls-Royce', 'rover': 'Rover', 'saab': 'Saab', 'seat': 'Seat', 'skoda': 'Skoda',
    'smart': 'Smart', 'subaru': 'Subaru', 'suzuki': 'Suzuki', 'tata': 'Tata', 'tesla': 'Tesla',
    'tofas': 'Tofaş', 'togg': 'Togg', 'toyota': 'Toyota', 'volkswagen': 'Volkswagen', 'volvo': 'Volvo',
    'jaecoo': 'Jaecoo', 'omoda': 'Omoda', 'skywell': 'Skywell', 'hongqi': 'Hongqi', 'genesis': 'Genesis'
  };
  var BAD_URL = /-sb2f-/;
  var MODEL_ALIAS = { 'range-evoque': 'range-rover-evoque', 'range-sport': 'range-rover-sport', 'range-velar': 'range-rover-velar', 'vw-cc': 'cc' };
  var BRAND_KEYS =Object.keys(BRANDS).sort(function (a, b) { return b.length - a.length; });

  var TR = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
  function slug(s) {
    return String(s || '').replace(/[çğıİöşüÇĞÖŞÜ]/g, function (c) { return TR[c]; })
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function titleModel(s) {
    s = String(s || '').trim().replace(/\s+/g, ' ');
    if (!s) return '';
    // "3 Serisi", "X-Trail", "Egea" gibi kalıpları koru; tamamen küçükse baş harfleri büyüt
    if (s === s.toLowerCase()) s = s.replace(/(^|[\s-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
    return s;
  }
  function slugToText(s) {
    // "1-4-ts" -> "1.4 TS", "320i-ed" -> "320i ED"
    return s.replace(/(\d)-(\d)/g, '$1.$2').split('-').map(function (t) {
      if (/^\d/.test(t)) return t;
      if (t.length <= 3) return t.toUpperCase();
      return t.charAt(0).toUpperCase() + t.slice(1);
    }).join(' ');
  }
  function num(v) {
    if (typeof v === 'number') return v;
    var n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }
  function matchBrand(rest) {
    for (var i = 0; i < BRAND_KEYS.length; i++) {
      var k = BRAND_KEYS[i];
      if (rest === k || rest.indexOf(k + '-') === 0) return k;
    }
    return null;
  }

  // 1. geçiş: sahibinden kayıtlarından marka -> model sözlüğü (model slug'ları)
  function buildModelDict(records) {
    var dict = {}, tot = {};
    records.forEach(function (r) {
      if (r.kaynak !== 'sahibinden' || !r.marka || BAD_URL.test(r.url || '')) return;
      var m = /\/ilan\/vasita-(?:otomobil|arazi-suv-pickup|minivan-panelvan|ticari-araclar|klasik-araclar)-(.+?)-\d+\/detay/.exec(r.url || '');
      if (!m) return;
      var b = matchBrand(m[1]); if (!b) return;
      var bn = BRANDS[b];
      var ms = slug(r.marka); if (!ms) return;
      dict[bn] = dict[bn] || {};
      dict[bn][ms] = dict[bn][ms] || { ad: titleModel(r.marka), n: 0 };
      dict[bn][ms].n++;
      tot[ms] = (tot[ms] || 0) + 1;
    });
    // her marka için uzun slug önce; model adı başka markada çoğunluktaysa (ör. "Audi Clio") atılır
    var out = {};
    Object.keys(dict).forEach(function (bn) {
      out[bn] = Object.keys(dict[bn]).filter(function (k) { return dict[bn][k].n >= 2 && dict[bn][k].n / tot[k] >= 0.3; })
        .sort(function (a, b) { return b.length - a.length; })
        .map(function (k) { return { slug: k, ad: dict[bn][k].ad }; });
    });
    return out;
  }

  // Tek kaydı standart biçime çevirir; çözemezse null
  function parseRecord(r, modelDict) {
    var fiyat = num(r.fiyat), yil = num(r.yil);
    if (!fiyat || !yil || yil < 1960 || yil > 2100) return null;
    var url = r.url || '', marka = null, model = null, versiyon = '';
    if (r.kaynak === 'sahibinden') {
      var m = /\/ilan\/vasita-(?:otomobil|arazi-suv-pickup|minivan-panelvan|ticari-araclar|klasik-araclar)-(.+?)-\d+\/detay/.exec(url);
      if (!m || BAD_URL.test(url)) return null;
      var b = matchBrand(m[1]); if (!b) return null;
      marka = BRANDS[b];
      versiyon = String(r.seri || '').trim();
      // sözlükte olmayan marka/model eşleşmesi = bozuk kayıt
      var ms = slug(r.marka), list = modelDict[marka] || [];
      model = null;
      for (var i = 0; i < list.length; i++) if (list[i].slug === ms) { model = list[i].ad; break; }
    } else if (r.kaynak === 'arabam') {
      var a = /\/ilan\/[a-z-]+?-satilik-(.+?)\//.exec(url);
      if (!a) return null;
      var rest = a[1], bk = matchBrand(rest); if (!bk) return null;
      marka = BRANDS[bk];
      rest = rest.slice(bk.length + 1);
      if (bk === 'mercedes' && rest.indexOf('benz-') === 0) rest = rest.slice(5);
      if (bk === 'kgm' && rest.indexOf('ssangyong-') === 0) rest = rest.slice(10);
      var mb = /^([abcegs])-(.*)$/.exec(rest);
      if (marka === 'Mercedes-Benz' && mb) { model = mb[1].toUpperCase() + ' Serisi'; versiyon = slugToText(mb[2]); }
      var lst = modelDict[marka] || [];
      for (var j = 0; !model && j < lst.length; j++) {
        var s = lst[j].slug;
        if (rest === s || rest.indexOf(s + '-') === 0) { model = lst[j].ad; versiyon = slugToText(rest.slice(s.length + 1)); break; }
      }
      if (!model) {
        // sözlükte yoksa: ilk parça (tek harfle başlıyorsa ilk iki parça: c-elysee, t-roc, c-hr, e-208)
        var tk = rest.split('-');
        var n = (tk[0].length === 1 || /^(range|john|model|grand|id)$/.test(tk[0])) ? 2 : 1;
        if (tk.length < n || /^\d+$/.test(tk[0]) && tk[0].length < 3) return null;
        model = slugToText(tk.slice(0, n).join('-')).replace(/^([A-Z]) /, '$1-');
        if (/^(range|john|model|grand)$/.test(tk[0])) model = model.replace('-', ' ');
        versiyon = slugToText(tk.slice(n).join('-'));
      }
    } else return null;
    if (!model) return null;
    return { marka: marka, model: model, versiyon: versiyon, yil: yil, km: num(r.km), fiyat: fiyat, kaynak: r.kaynak, url: url };
  }

  function quantile(sorted, q) {
    if (!sorted.length) return 0;
    var pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  // Kayıtları marka|model|yıl bazında toplar, IQR ile uç değerleri atar
  function aggregate(records, opts) {
    opts = opts || {};
    var minN = opts.minAdet || 3;
    var dict = buildModelDict(records);
    var groups = {}, parsed = 0, versions = {}, names = {}, vtmp = [];
    records.forEach(function (r) {
      var p = parseRecord(r, dict); if (!p) return;
      parsed++;
      var ms = slug(p.model); ms = MODEL_ALIAS[ms] || ms;
      var nk = p.marka + '|' + ms;
      var nm = names[nk] || (names[nk] = {}); nm[p.model] = (nm[p.model] || 0) + 1;
      var k = nk + '|' + p.yil;
      var g = groups[k] || (groups[k] = { nk: nk, yil: p.yil, f: [], km: [] });
      g.f.push(p.fiyat); if (p.km) g.km.push(p.km);
      if (p.versiyon) {
        var vk = nk;
        var vv = versions[vk] || (versions[vk] = {});
        var vn = p.versiyon.replace(/\s+/g, ' ').trim();
        if (vn.length <= 40) vv[vn] = (vv[vn] || 0) + 1;
      }
    });
    // her model için en sık görülen yazım
    var disp = {};
    Object.keys(names).forEach(function (nk) {
      var o = names[nk]; disp[nk] = Object.keys(o).sort(function (a, b) { return o[b] - o[a]; })[0];
    });
    var rows = [];
    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      var f = g.f.sort(function (a, b) { return a - b; });
      var q1 = quantile(f, 0.25), q3 = quantile(f, 0.75), iqr = q3 - q1;
      var lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
      var ff = f.filter(function (x) { return x >= lo && x <= hi; });
      if (ff.length < minN) return;
      var km = g.km.sort(function (a, b) { return a - b; });
      rows.push({
        marka: g.nk.split('|')[0], model: disp[g.nk], yil: g.yil, adet: ff.length,
        medyan: Math.round(quantile(ff, 0.5)), p25: Math.round(quantile(ff, 0.25)), p75: Math.round(quantile(ff, 0.75)),
        km: km.length ? Math.round(quantile(km, 0.5)) : 0
      });
    });
    rows.sort(function (a, b) { return a.marka.localeCompare(b.marka, 'tr') || a.model.localeCompare(b.model, 'tr') || b.yil - a.yil; });
    // versiyonlar: en az 2 kez görülen ilk 25
    var ver = {};
    Object.keys(versions).forEach(function (vk) {
      var arr = Object.keys(versions[vk]).filter(function (v) { return versions[vk][v] >= 2; })
        .sort(function (a, b) { return versions[vk][b] - versions[vk][a]; }).slice(0, 25);
      if (arr.length) ver[vk.split('|')[0] + '|' + disp[vk]] = arr.sort(function (a, b) { return a.localeCompare(b, 'tr'); });
    });
    return { toplamKayit: records.length, cozulen: parsed, satirlar: rows, versiyonlar: ver };
  }

  var api = { BRANDS: BRANDS, slug: slug, parseRecord: parseRecord, buildModelDict: buildModelDict, aggregate: aggregate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RobotCore = api;
})(this);
