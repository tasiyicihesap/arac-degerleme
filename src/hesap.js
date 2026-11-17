// OTOKABUL — hesaplama araçları (SEO sayfaları). Tutarlar resmî tarifeden alınır, her yıl güncellenmelidir.
// 2026 MTV: Motorlu Taşıtlar Vergisi Genel Tebliği (Seri No: 58), Resmî Gazete 31.12.2025 — (I) ve (I/A) sayılı tarifeler
export const MTV_YIL = 2026;
// [motor üst sınırı cm³, [[taşıt değeri üst sınırı (null = sınırsız), [1-3, 4-6, 7-11, 12-15, 16+]], ...]]
export const MTV_I = [
  [1300, [[309100, [5750, 4010, 2238, 1689, 593]], [541500, [6319, 4409, 2459, 1861, 655]], [null, [6902, 4807, 2693, 2032, 706]]]],
  [1600, [[309100, [10016, 7510, 4354, 3077, 1181]], [541500, [11023, 8264, 4794, 3375, 1290]], [null, [12028, 9012, 5220, 3685, 1408]]]],
  [1800, [[775100, [19472, 15226, 8948, 5458, 2113]], [null, [21251, 16600, 9775, 5964, 2307]]]],
  [2000, [[775100, [30679, 23625, 13886, 8264, 3248]], [null, [33474, 25784, 15147, 9012, 3547]]]],
  [2500, [[968100, [46027, 33413, 20874, 12465, 4930]], [null, [50217, 36448, 22768, 13606, 5378]]]],
  [3000, [[1937500, [64175, 55837, 34878, 18758, 6875]], [null, [70018, 60905, 38053, 20466, 7503]]]],
  [3500, [[1937500, [97744, 87954, 52976, 26443, 9684]], [null, [106641, 95940, 57791, 28839, 10578]]]],
  [4000, [[3101800, [153684, 132712, 78152, 34878, 13886]], [null, [167671, 144770, 85271, 38053, 15147]]]],
  [99999, [[3683200, [251554, 188627, 111714, 50206, 19472]], [null, [274415, 205781, 121873, 54769, 21251]]]],
];
export const MTV_IA = [
  [1300, [5750, 4010, 2238, 1689, 593]], [1600, [10016, 7510, 4354, 3077, 1181]], [1800, [17705, 13829, 8145, 4957, 1917]],
  [2000, [27898, 21478, 12624, 7510, 2958]], [2500, [41840, 30372, 18977, 11333, 4479]], [3000, [58347, 50754, 31704, 17044, 6255]],
  [3500, [88859, 79955, 48158, 24031, 8813]], [4000, [139721, 120647, 71048, 31704, 12624]], [99999, [228681, 171485, 101555, 45632, 17705]],
];

export function mtvSayfaGovde(h, cta) {
  const veri = JSON.stringify({ yil: MTV_YIL, I: MTV_I, IA: MTV_IA });
  return `<section class="rh-bas"><h1>${MTV_YIL} MTV Hesaplama</h1><p>Aracının motor hacmini, model yılını ve tescil tarihini seç; ${MTV_YIL} yılı motorlu taşıtlar vergisini ve Ocak/Temmuz taksitlerini hemen gör.</p></section>
<div class="hs-kutu" id="mtvKutu">
  <div class="hs-alanlar">
    <label>İlk tescil tarihi<select id="mTescil"><option value="I">1 Ocak 2018 ve sonrası</option><option value="IA">31 Aralık 2017 ve öncesi</option></select></label>
    <label>Motor hacmi<select id="mHacim">
      <option value="1300">1300 cm³ ve altı</option><option value="1600" selected>1301 – 1600 cm³</option><option value="1800">1601 – 1800 cm³</option><option value="2000">1801 – 2000 cm³</option>
      <option value="2500">2001 – 2500 cm³</option><option value="3000">2501 – 3000 cm³</option><option value="3500">3001 – 3500 cm³</option><option value="4000">3501 – 4000 cm³</option><option value="99999">4001 cm³ ve üzeri</option></select></label>
    <label>Model yılı<select id="mYil"></select></label>
    <label id="mDegerKap">Taşıt değeri (ilk alıştaki KDV hariç değer)<select id="mDeger"></select></label>
  </div>
  <div class="hs-sonuc" id="mSonuc"></div>
  <p class="hs-not">Tutarlar ${MTV_YIL} yılı resmî tarifesinden (MTV Genel Tebliği Seri No: 58, Resmî Gazete 31.12.2025) alınmıştır. Yaş hesabında model yılı 1 yaş sayılır. Elektrikli, hibrit ve ticari araçlar ile özel durumlar için kesin tutarı Gelir İdaresi'nin (GİB) sorgulama ekranından kontrol edin.</p>
</div>
<script>(function(){var V=${veri};var $=function(i){return document.getElementById(i)};var nf=new Intl.NumberFormat('tr-TR');
var ys=$('mYil');for(var y=V.yil;y>=V.yil-30;y--){var o=document.createElement('option');o.value=y;o.textContent=y;ys.appendChild(o);} ys.value=V.yil-4;
function dilimler(){var hc=+$('mHacim').value,s=V.I.find(function(r){return hc<=r[0]});var d=$('mDeger'),eski=d.value;d.innerHTML='';var alt=0;s[1].forEach(function(b,i){var o=document.createElement('option');o.value=i;o.textContent=b[0]===null?nf.format(alt)+' TL üzeri':(alt?nf.format(alt)+' – ':'')+nf.format(b[0])+' TL'+(alt?'':' ve altı');alt=b[0];d.appendChild(o);});if(eski&&+eski<s[1].length)d.value=eski;}
function hesap(){var t=$('mTescil').value,hc=+$('mHacim').value,yas=V.yil-(+$('mYil').value)+1,g=yas<=3?0:yas<=6?1:yas<=11?2:yas<=15?3:4,tutar;
$('mDegerKap').style.display=t==='I'?'':'none';
if(t==='I'){var s=V.I.find(function(r){return hc<=r[0]});tutar=s[1][+$('mDeger').value||0][1][g];}else{tutar=V.IA.find(function(r){return hc<=r[0]})[1][g];}
var yg=['1-3','4-6','7-11','12-15','16 ve üzeri'][g];
$('mSonuc').innerHTML='<div class="hs-buyuk"><span>'+V.yil+' yıllık MTV</span><b>'+nf.format(tutar)+' TL</b></div><div class="hs-satir"><span>Ocak taksiti</span><b>'+nf.format(Math.round(tutar/2))+' TL</b></div><div class="hs-satir"><span>Temmuz taksiti</span><b>'+nf.format(tutar-Math.round(tutar/2))+' TL</b></div><div class="hs-satir"><span>Araç yaşı (vergi)</span><b>'+yas+' yaş · '+yg+' yaş grubu</b></div>';}
$('mHacim').onchange=function(){dilimler();hesap()};['mTescil','mYil','mDeger'].forEach(function(i){$(i).onchange=hesap});dilimler();hesap();})();</script>
${cta('Aracını satmayı düşünüyorsan değerini de öğren', '/#degerle')}
<section class="rh-bas"><h2>MTV nasıl hesaplanır?</h2><p>MTV bir formülle değil, kanun ekindeki tablolardan okunarak bulunur. 1 Ocak 2018 ve sonrasında tescil edilen otomobillerde motor hacmi, araç yaşı ve aracın ilk alındığındaki KDV hariç değeri birlikte dikkate alınır. 2017 ve öncesinde tescil edilen araçlarda yalnızca motor hacmi ve yaş belirleyicidir. Vergi yılda iki eşit taksitle, Ocak ve Temmuz aylarında ödenir.</p></section>`;
}

// 2026 ikinci el araç satışında noter masrafı (1 Ocak 2026'dan itibaren nispi harç):
// harç = satış bedeli ile kasko değerinden yüksek olanın binde 2'si (en az 1.000 TL); yetki belgeli galeriye satışta harç alınmaz.
// noter ücreti = harcın %30'u; motorlu araç tescil belgesi (değerli kağıt) 1.511 TL. Yazı ücreti ve kağıt bedelleri notere göre eklenir.
export const NOTER = { yil: 2026, oran: 0.002, asgari: 1000, ucretOran: 0.30, tescilBelgesi: 1511, yaziSayfa: 80.68 };

export function noterSayfaGovde(h, cta) {
  const v = JSON.stringify(NOTER);
  return `<section class="rh-bas"><h1>${NOTER.yil} Noter Araç Satış Masrafı Hesaplama</h1><p>İkinci el aracını noterde satarken ödenecek harcı, noter ücretini ve tescil belgesi bedelini hemen hesapla. ${NOTER.yil} yılından itibaren araç satışlarında satış bedeline bağlı harç alınıyor.</p></section>
<div class="hs-kutu">
  <div class="hs-alanlar">
    <label>Satış bedeli (TL)<input id="nBedel" inputmode="numeric" placeholder="ör. 750.000" value="750.000"></label>
    <label>Aracın güncel kasko değeri (TL) <small style="font-weight:500;color:#6b7280">biliyorsan</small><input id="nKasko" inputmode="numeric" placeholder="boş bırakabilirsin"></label>
    <label class="hs-tek"><span><input type="checkbox" id="nGaleri"> Aracı yetki belgeli bir galeriye satıyorum (ör. OTOKABUL)</span></label>
  </div>
  <div class="hs-sonuc" id="nSonuc"></div>
  <p class="hs-not">Harç, satış bedeli ile kasko değerinden hangisi yüksekse onun binde 2'si olarak alınır ve en az ${NOTER.asgari.toLocaleString('tr-TR')} TL'dir. Yetki belgesi olan ikinci el araç ticareti işletmelerine (galerilere) yapılan satışlarda bu harç alınmaz. Noter ücreti harcın %30'udur; motorlu araç tescil belgesi bedeli ${NOTER.tescilBelgesi.toLocaleString('tr-TR')} TL'dir. Bunlara noterin yazı ücreti (sayfa başına ${NOTER.yaziSayfa.toLocaleString('tr-TR')} TL) ve kağıt bedelleri eklenir; bu yüzden toplam tutar notere göre birkaç yüz TL değişebilir. Kesin tutarı işlem yapacağın noterden öğrenebilirsin.</p>
</div>
<script>(function(){var N=${v};var $=function(i){return document.getElementById(i)};var nf=new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2});
var sayi=function(e){return parseInt(String(e.value).replace(/[^0-9]/g,''),10)||0};
var bicim=function(e){var n=sayi(e);e.value=n?n.toLocaleString('tr-TR'):''};
function hesap(){var b=sayi($('nBedel')),k=sayi($('nKasko')),esas=Math.max(b,k),galeri=$('nGaleri').checked;
var harc=galeri?0:Math.max(N.asgari,esas*N.oran),ucret=harc*N.ucretOran,top=harc+ucret+N.tescilBelgesi;
$('nSonuc').innerHTML=(esas?'':'<p class="hs-not">Satış bedelini yaz.</p>')+'<div class="hs-buyuk"><span>Tahmini noter masrafı</span><b>'+nf.format(Math.round(top))+' TL +</b></div>'+
'<div class="hs-satir"><span>Harç (binde 2'+(k>b?', kasko değeri üzerinden':'')+')</span><b>'+(galeri?'Alınmaz':nf.format(harc)+' TL')+'</b></div>'+
'<div class="hs-satir"><span>Noter ücreti (harcın %30\\'u)</span><b>'+nf.format(ucret)+' TL</b></div>'+
'<div class="hs-satir"><span>Motorlu araç tescil belgesi</span><b>'+nf.format(N.tescilBelgesi)+' TL</b></div>'+
'<div class="hs-satir"><span>Yazı ücreti ve kağıt bedelleri</span><b>notere göre</b></div>';}
['nBedel','nKasko'].forEach(function(i){$(i).addEventListener('input',function(){bicim($(i));hesap()})});$('nGaleri').onchange=hesap;hesap();})();</script>
${cta('Aracını OTOKABUL\'a sat: noter işlemlerini biz ayarlarız', '/#degerle')}
<section class="rh-bas"><h2>Noterde araç satışı nasıl yapılır?</h2><p>Alıcı ve satıcı kimlikleriyle notere gider; aracın ruhsatı ve geçerli trafik sigortası gerekir. Satış bedeli sözleşmeye yazılır, harç ve ücretler ödenir ve devir aynı gün tamamlanır. OTOKABUL'a satışta noter randevusunu ve devir işlemlerini biz ayarlarız; ödeme imza günü hesabına geçer.</p></section>`;
}
