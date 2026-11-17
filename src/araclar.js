// OTOKABUL — otomobil hesaplama araçları (SEO sayfaları)
// Metinler OTOKABUL'a özgüdür. Resmî tutarlar her yıl Ocak'ta güncellenmelidir:
//  · ÖTV: 4760 sayılı Kanun (II) sayılı liste 87.03 — 10115 sayılı Cumhurbaşkanı Kararı (RG 24.07.2025, 32965)
//  · Muayene: 2026 yeniden değerleme oranı %25,49 ile güncellenen TÜVTÜRK tarifesi; gecikmede her ay %5
//  · KDV (otomobil): %20
export const HESAP_YIL = 2026;

// Hesaplamalar listesi (menü, alt bilgi, site haritası ve "diğer hesaplamalar" kutusu bu listeden üretilir)
export const ARACLAR = [
  { slug: 'otv-hesaplama', ad: 'ÖTV hesaplama', ikon: '🧾', kisa: 'Sıfır aracın vergisiz fiyatından ÖTV ve KDV' },
  { slug: 'mtv-hesaplama', ad: 'MTV hesaplama', ikon: '📅', kisa: 'Yıllık motorlu taşıtlar vergisi ve taksitler' },
  { slug: 'arac-muayene-ucreti-hesaplama', ad: 'Muayene ücreti ve gecikme', ikon: '🔧', kisa: 'TÜVTÜRK ücreti ve gecikme bedeli' },
  { slug: 'yakit-hesaplama', ad: 'Yakıt ve yol masrafı', ikon: '⛽', kisa: 'Yolculuğun yakıt maliyeti, ortalama tüketim' },
  { slug: 'elektrikli-arac-sarj-hesaplama', ad: 'Elektrikli araç şarj maliyeti', ikon: '🔌', kisa: 'Şarj maliyeti, süresi ve 100 km gideri' },
  { slug: 'kw-hp-donusturme', ad: 'kW – beygir (HP) çevirme', ikon: '⚡', kisa: 'Motor gücünü kW ve beygir arasında çevir' },
  { slug: 'lastik-ebadi-hesaplama', ad: 'Lastik ebadı karşılaştırma', ikon: '🛞', kisa: 'Çap farkı ve hız göstergesi sapması' },
  { slug: 'yillik-km-hesaplama', ad: 'Yıllık ortalama km', ikon: '🛣️', kisa: 'Aracın yılda ortalama kaç km yaptığı' },
  { slug: 'plaka-il-kodlari', ad: 'Plaka il kodları', ikon: '🔢', kisa: '01\'den 81\'e il plaka kodları' },
];
export const ARAC_SLUGLAR = ARACLAR.map((a) => a.slug);

// ---- ortak reklam / yönlendirme blokları ----
export function reklamUst(h, metin) {
  return `<a class="hs-reklam-ust" href="/#degerle"><span class="hr-ikon">🚗</span><span><b>${h(metin || 'Aracını satmayı düşünüyor musun?')}</b> OTOKABUL değerleme robotu aracının bugünkü değerini 2 dakikada hesaplar.</span><span class="hr-btn">Hemen değerle →</span></a>`;
}
export function reklamKart() {
  return `<section class="hs-reklam-kart"><div class="hk-yazi"><span class="hk-rozet">OTOKABUL.COM.TR</span><h2>Hesap kitap bizden, aracının değeri de</h2><p>Marka, model, yıl ve kilometreyi gir; OTOKABUL ön teklifini aynı ekranda görürsün. Beğenirsen ekspertizi ücretsiz yapar, noter işlemlerini üstlenir, ödemeyi aynı gün hesabına geçeriz.</p>
<ul><li>✔ Ücretsiz ekspertiz</li><li>✔ Noter işlemleri OTOKABUL'da</li><li>✔ Aynı gün ödeme</li></ul></div><a class="hk-btn" href="/#degerle">Aracımı ücretsiz değerle →</a></section>`;
}
export function digerleri(h, slug) {
  const l = ARACLAR.filter((a) => a.slug !== slug);
  return `<section class="hs-diger"><h2>OTOKABUL'daki diğer hesaplamalar</h2><div class="hs-diger-iz">${l.map((a) => `<a href="/${a.slug}/"><span>${a.ikon}</span><b>${h(a.ad)}</b><small>${h(a.kisa)}</small></a>`).join('')}<a class="hs-diger-robot" href="/#degerle"><span>🤖</span><b>Araç değerleme robotu</b><small>Aracının değerini 2 dakikada öğren</small></a></div></section>`;
}

// ---- sayfalar ----
// her sayfa: { baslik, aciklama, h1, giris, arac (hesaplayıcı HTML + script), bilgi (açıklama bölümleri), sss }
const nfJs = "var nf=new Intl.NumberFormat('tr-TR'),nf2=new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});var $=function(i){return document.getElementById(i)};var sayi=function(v){return parseFloat(String(v||'').replace(/\\./g,'').replace(',','.'))||0};";

// ÖTV grupları: [üst sınır (null = sınırsız), oran]
const OTV = {
  b1400: { ad: 'Benzinli/dizel · 1400 cm³ ve altı', d: [[650000, 70], [900000, 75], [1100000, 80], [null, 90]] },
  b1600: { ad: 'Benzinli/dizel · 1401 – 1600 cm³', d: [[850000, 75], [1100000, 80], [1650000, 90], [null, 100]] },
  b2000: { ad: 'Benzinli/dizel · 1601 – 2000 cm³', d: [[1650000, 150], [null, 170]] },
  b2001: { ad: 'Benzinli/dizel · 2000 cm³ üzeri', d: [[null, 220]] },
  h1800: { ad: 'Hibrit · 1601 – 1800 cm³, elektrik motoru 50 kW üzeri', d: [[1250000, 70], [null, 80]] },
  h2500: { ad: 'Hibrit · 2001 – 2500 cm³, elektrik motoru 100 kW üzeri', d: [[1650000, 150], [null, 170]] },
  e160: { ad: 'Tam elektrikli · motor gücü 160 kW ve altı', d: [[1650000, 25], [null, 55]] },
  e161: { ad: 'Tam elektrikli · motor gücü 160 kW üzeri', d: [[1650000, 65], [null, 75]] },
};

const SAYFALAR = {
  'otv-hesaplama': {
    baslik: `ÖTV Hesaplama ${HESAP_YIL} — Otomobil ÖTV ve KDV | OTOKABUL`,
    aciklama: `${HESAP_YIL} otomobil ÖTV hesaplama: motor hacmi, hibrit ve elektrikli seçeneklerine göre ÖTV oranını, ÖTV ve KDV tutarını, vergili fiyatı OTOKABUL ile saniyeler içinde gör.`,
    h1: `${HESAP_YIL} Otomobil ÖTV Hesaplama`,
    giris: 'Sıfır bir otomobilin fiyatının ne kadarının vergi olduğunu merak ediyorsan doğru yerdesin. OTOKABUL ÖTV hesaplayıcısı, vergisiz fiyattan vergili fiyata ya da etiket fiyatından vergisiz fiyata iki yönlü hesap yapar.',
    arac: `<div class="hs-kutu">
  <div class="hs-sekme" id="oYon"><button type="button" class="secili" data-v="ileri">Vergisiz fiyattan hesapla</button><button type="button" data-v="geri">Etiket (vergili) fiyattan hesapla</button></div>
  <div class="hs-alanlar">
    <label class="hs-tek">Araç tipi ve motor<select id="oGrup">${Object.entries(OTV).map(([k, v]) => `<option value="${k}"${k === 'b1600' ? ' selected' : ''}>${v.ad}</option>`).join('')}</select></label>
    <label class="hs-tek"><span id="oFiyatAd">Vergisiz fiyat (ÖTV matrahı, TL)</span><input id="oFiyat" inputmode="numeric" placeholder="ör. 900.000" value="900.000"></label>
  </div>
  <div class="hs-sonuc" id="oSonuc"></div>
  <p class="hs-not">Oranlar ${HESAP_YIL} yılında yürürlükte olan 10115 sayılı Cumhurbaşkanı Kararı'na (Resmî Gazete 24.07.2025) göre hesaplanır; otomobillerde KDV %20'dir. ÖTV dilimi tüm fiyata uygulanır, yani matrah bir sınırı aştığında oran tamamına yükselir. Şarj edilebilir hibritler, engelli muafiyeti ve ticari araçlar için oranlar farklıdır; kesin tutar için yetkili satıcıya danışın.</p>
</div>
<script>(function(){${nfJs}var G=${JSON.stringify(OTV)},yon='ileri';
function dilimOran(d,m){for(var i=0;i<d.length;i++){if(d[i][0]===null||m<=d[i][0])return d[i][1];}return d[d.length-1][1];}
function ciz(m,oran,not){var otv=m*oran/100,kdv=(m+otv)*0.20,top=m+otv+kdv;
$('oSonuc').innerHTML='<div class="hs-buyuk"><span>Vergili satış fiyatı</span><b>'+nf.format(Math.round(top))+' TL</b></div>'+
'<div class="hs-satir"><span>Vergisiz fiyat (ÖTV matrahı)</span><b>'+nf.format(Math.round(m))+' TL</b></div>'+
'<div class="hs-satir"><span>ÖTV oranı</span><b>%'+oran+'</b></div>'+
'<div class="hs-satir"><span>ÖTV tutarı</span><b>'+nf.format(Math.round(otv))+' TL</b></div>'+
'<div class="hs-satir"><span>KDV (%20)</span><b>'+nf.format(Math.round(kdv))+' TL</b></div>'+
'<div class="hs-satir"><span>Toplam vergi</span><b>'+nf.format(Math.round(otv+kdv))+' TL · fiyatın %'+nf.format(Math.round((otv+kdv)/top*100))+'\\'i</b></div>'+(not?'<p class="hs-uyari">'+not+'</p>':'');}
function hesap(){var g=G[$('oGrup').value].d,f=sayi($('oFiyat').value);if(!f){$('oSonuc').innerHTML='';return;}
if(yon==='ileri'){ciz(f,dilimOran(g,f));return;}
var alt=0,bul=null;for(var i=0;i<g.length;i++){var r=g[i][1],m=f/((1+r/100)*1.2);if(m>alt&&(g[i][0]===null||m<=g[i][0])){bul=[m,r];break;}alt=g[i][0]||alt;}
if(bul)ciz(bul[0],bul[1]);else{var s=null,a2=0;for(var j=0;j<g.length;j++){if(g[j][0]!==null&&f/((1+g[j][1]/100)*1.2)>g[j][0]){s=[g[j][0],g[j][1]];}a2=g[j][0];}
ciz(s?s[0]:f/1.2,s?s[1]:g[0][1],'Bu etiket fiyatı iki ÖTV dilimi arasındaki boşluğa denk geliyor; böyle bir fiyatla satış pratikte olmaz. En yakın dilim sınırına göre gösterildi.');}}
$('oYon').onclick=function(e){var b=e.target.closest('button');if(!b)return;yon=b.dataset.v;[].forEach.call(this.children,function(x){x.classList.toggle('secili',x===b)});$('oFiyatAd').textContent=yon==='ileri'?'Vergisiz fiyat (ÖTV matrahı, TL)':'Etiket fiyatı (ÖTV ve KDV dahil, TL)';$('oFiyat').value=yon==='ileri'?'900.000':'2.000.000';hesap();};
$('oFiyat').oninput=function(){var n=sayi(this.value);this.value=n?nf.format(n):'';hesap();};$('oGrup').onchange=hesap;hesap();})();</script>`,
    bilgi: `<section class="rh-bas"><h2>ÖTV dilimleri nasıl işliyor?</h2><p>Binek otomobillerde ÖTV, aracın vergisiz fiyatına (matrah) uygulanır ve oran motor hacmine, hibrit ya da elektrikli olmasına ve matrahın hangi aralıkta kaldığına göre belirlenir. Burada dikkat edilmesi gereken nokta, dilimlerin gelir vergisindeki gibi kademeli işlememesidir: matrah bir sınırı birkaç lira aşsa bile aracın tamamı üst oranla vergilendirilir. Bu yüzden markalar fiyatlarını çoğu zaman sınırların hemen altında tutar.</p>
<div class="hs-tablo-kap"><table class="hs-tablo"><thead><tr><th>Araç grubu</th><th>Matrah aralığı</th><th>ÖTV</th></tr></thead><tbody>${Object.values(OTV).map((g) => { let alt = 0; return g.d.map((d, i) => { const r = `<tr>${i === 0 ? `<td rowspan="${g.d.length}">${g.ad}</td>` : ''}<td>${d[0] === null ? (alt ? alt.toLocaleString('tr-TR') + ' TL üzeri' : 'Tüm fiyatlar') : (alt ? alt.toLocaleString('tr-TR') + ' – ' : '') + d[0].toLocaleString('tr-TR') + ' TL' + (alt ? '' : ' ve altı')}</td><td>%${d[1]}</td></tr>`; alt = d[0]; return r; }).join(''); }).join('')}</tbody></table></div>
<h2>Etiket fiyatından vergisiz fiyat nasıl bulunur?</h2><p>Bayide gördüğün fiyat ÖTV ve KDV dahil fiyattır. Vergisiz fiyatı bulmak için etiket fiyatı önce 1,20'ye (KDV), sonra 1 + ÖTV oranına bölünür. Hangi oranın geçerli olduğu, bulunan matrahın dilim sınırlarına uyup uymamasıyla anlaşılır; OTOKABUL hesaplayıcısı bu kontrolü senin yerine yapar.</p>
<h2>ÖTV ikinci el araç fiyatlarını neden etkiler?</h2><p>Sıfır araçtaki vergi yükü arttıkça ikinci el piyasası da yukarı yönlü hareket eder; çünkü alıcı sıfıra ödeyeceği fiyatla birkaç yaşındaki aracı kıyaslar. OTOKABUL, aracına teklif verirken güncel sıfır fiyatlarını ve piyasadaki karşılığını birlikte değerlendirir.</p></section>`,
    sss: [
      ['ÖTV dilimi aşılınca tüm fiyata mı yüksek oran uygulanır?', 'Evet. Binek otomobil ÖTV\'sinde dilimler kademeli değildir; matrah sınırı aşan araçta yeni oran vergisiz fiyatın tamamına uygulanır.'],
      ['Otomobilde KDV oranı kaç?', 'Binek otomobil satışlarında KDV oranı %20\'dir ve vergisiz fiyat ile ÖTV toplamı üzerinden hesaplanır.'],
      ['Elektrikli araçlarda ÖTV nasıl belirlenir?', 'Tam elektrikli otomobillerde motor hacmi olmadığı için oran, elektrik motorunun gücüne (160 kW sınırı) ve vergisiz fiyatın 1.650.000 TL\'yi aşıp aşmamasına göre belirlenir.'],
      ['İkinci el araç satışında ÖTV ödenir mi?', 'Hayır. ÖTV, aracın ilk satışında bir kez ödenir. Aracını OTOKABUL\'a satarken ÖTV ödemezsin.'],
    ],
  },

  'arac-muayene-ucreti-hesaplama': {
    baslik: `Araç Muayene Ücreti ${HESAP_YIL} ve Gecikme Bedeli Hesaplama | OTOKABUL`,
    aciklama: `${HESAP_YIL} TÜVTÜRK araç muayene ücretini ve muayenesi geçen aracın gecikme bedelini OTOKABUL ile hemen hesapla: otomobil, ağır vasıta ve motosiklet.`,
    h1: `${HESAP_YIL} Araç Muayene Ücreti ve Gecikme Hesaplama`,
    giris: 'Muayene tarihini kaçırdıysan ne kadar fazla ödeyeceğini önceden bilmek istersin. OTOKABUL hesaplayıcısı, araç türünü ve muayenenin son geçerlilik tarihini seçtiğinde ödeyeceğin toplam tutarı çıkarır.',
    arac: `<div class="hs-kutu">
  <div class="hs-alanlar">
    <label class="hs-tek">Araç türü<select id="mTur"><option value="3288">Otomobil, minibüs, kamyonet, arazi taşıtı, römork</option><option value="4446">Otobüs, kamyon, çekici, tanker</option><option value="1674">Motosiklet, motorlu bisiklet, traktör</option></select></label>
    <label>Muayenenin son geçerlilik tarihi<input type="date" id="mTarih"></label>
    <label>Muayeneye gideceğin tarih<input type="date" id="mGidis"></label>
  </div>
  <div class="hs-sonuc" id="mSonuc"></div>
  <p class="hs-not">${HESAP_YIL} ücretleri yeniden değerleme oranıyla (%25,49) güncellenen TÜVTÜRK tarifesine göredir ve KDV dahildir; kuruşlar yuvarlanmıştır. Muayene süresi geçen araçlardan geçen her ay için muayene ücretinin %5'i kadar gecikme bedeli alınır; ayın bir günü bile geçse o ay tam sayılır. Egzoz emisyon ölçümü ayrıca ücretlendirilir. Kesin tutarı TÜVTÜRK gişesinde öğrenebilirsin.</p>
</div>
<script>(function(){${nfJs}var bug=new Date();function iso(d){return d.toISOString().slice(0,10)}
$('mGidis').value=iso(bug);var t=new Date(bug);t.setMonth(t.getMonth()-2);$('mTarih').value=iso(t);
function ayFark(a,b){var m=(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth());if(b.getDate()>a.getDate())m++;return Math.max(0,m);}
function hesap(){var u=+$('mTur').value,a=new Date($('mTarih').value),b=new Date($('mGidis').value);if(isNaN(a)||isNaN(b)){$('mSonuc').innerHTML='';return;}
var ay=b<=a?0:ayFark(a,b),g=u*0.05*ay;
$('mSonuc').innerHTML='<div class="hs-buyuk"><span>Ödenecek toplam</span><b>'+nf2.format(u+g)+' TL</b></div><div class="hs-satir"><span>Muayene ücreti</span><b>'+nf.format(u)+' TL</b></div><div class="hs-satir"><span>Gecikme</span><b>'+(ay?ay+' ay':'Yok')+'</b></div><div class="hs-satir"><span>Gecikme bedeli (%5 × '+ay+')</span><b>'+nf2.format(g)+' TL</b></div>'+(ay?'<p class="hs-uyari">Muayenesi geçmiş araçla trafiğe çıkmak ayrıca trafik cezası gerektirir. Muayeneni bir an önce yaptırmanı öneririz.</p>':'<p class="hs-ok">Muayene süren dolmamış, gecikme bedeli yok.</p>');}
['mTur','mTarih','mGidis'].forEach(function(i){$(i).onchange=hesap});hesap();})();</script>`,
    bilgi: `<section class="rh-bas"><h2>${HESAP_YIL} TÜVTÜRK muayene ücretleri</h2><div class="hs-tablo-kap"><table class="hs-tablo"><thead><tr><th>Araç türü</th><th>Muayene ücreti</th><th>1 ay gecikmeli</th></tr></thead><tbody>
<tr><td>Otomobil, minibüs, kamyonet, arazi taşıtı, römork</td><td>3.288 TL</td><td>3.452 TL</td></tr><tr><td>Otobüs, kamyon, çekici, tanker</td><td>4.446 TL</td><td>4.668 TL</td></tr><tr><td>Motosiklet, motorlu bisiklet, traktör</td><td>1.674 TL</td><td>1.758 TL</td></tr></tbody></table></div>
<h2>Otomobil ne sıklıkla muayeneye girer?</h2><p>Hususi otomobiller ilk tescilden 3 yıl sonra ilk muayenesini olur, sonrasında 2 yılda bir muayeneye girer. Taksi, kamyonet ve kamyon gibi ticari araçlar ise her yıl muayene edilir. Muayene tarihini ruhsatındaki kayıttan ya da e-Devlet'ten kontrol edebilirsin.</p>
<h2>Muayenesi yaklaşan aracını satmak mı istiyorsun?</h2><p>Muayene tarihi yaklaşan ya da geçmiş bir aracı satmak için önce muayeneye götürmen gerekmez. OTOKABUL aracını olduğu gibi değerlendirir; ekspertizi ücretsiz yapar, muayene durumunu teklife şeffaf biçimde yansıtır.</p></section>`,
    sss: [
      ['Muayene gecikme bedeli nasıl hesaplanır?', 'Muayene süresinin dolduğu günden itibaren geçen her ay için muayene ücretinin %5\'i eklenir. Bir ayın tek günü geçse bile o ay tam sayılır; örneğin 3 ay gecikmede ücret %15 fazlasıyla ödenir.'],
      ['Muayene ücretine KDV dahil mi?', 'Evet, TÜVTÜRK\'ün açıkladığı ücretler KDV dahildir. Egzoz emisyon ölçümü muayene ücretine dahil değildir.'],
      ['Muayenesi geçmiş aracımı satabilir miyim?', 'Evet. OTOKABUL muayenesi geçmiş araçları da değerlendirir; teklif verirken muayene durumunu ve gecikme maliyetini hesaba katar.'],
    ],
  },

  'yakit-hesaplama': {
    baslik: 'Yakıt Hesaplama — Yol Masrafı ve Ortalama Tüketim | OTOKABUL',
    aciklama: 'Gideceğin yolun yakıt masrafını, kişi başı payı ve aracının gerçek ortalama tüketimini OTOKABUL yakıt hesaplayıcısıyla saniyeler içinde bul.',
    h1: 'Yakıt ve Yol Masrafı Hesaplama',
    giris: 'Yola çıkmadan önce bütçeni bilmek her zaman iyidir. OTOKABUL yakıt hesaplayıcısı gideceğin mesafeye ve aracının tüketimine göre yakıt masrafını çıkarır; ikinci sekmede ise depoyu doldurarak aracının gerçek ortalamasını bulursun.',
    arac: `<div class="hs-kutu">
  <div class="hs-sekme" id="yYon"><button type="button" class="secili" data-v="yol">Yol masrafı</button><button type="button" data-v="ort">Ortalama tüketim</button></div>
  <div class="hs-alanlar" id="yYol">
    <label>Mesafe (km)<input id="yKm" inputmode="decimal" value="450"></label>
    <label>Ortalama tüketim (lt / 100 km)<input id="yTuk" inputmode="decimal" value="6,5"></label>
    <label>Yakıt litre fiyatı (TL)<input id="yFiyat" inputmode="decimal" placeholder="İstasyondaki güncel fiyat"></label>
    <label>Kişi sayısı<input id="yKisi" inputmode="numeric" value="1"></label>
    <label class="hs-tek"><span><input type="checkbox" id="yDonus"> Gidiş – dönüş hesapla</span></label>
  </div>
  <div class="hs-alanlar" id="yOrt" hidden>
    <label>Alınan yakıt (litre)<input id="oLt" inputmode="decimal" value="40"></label>
    <label>Bu yakıtla gidilen yol (km)<input id="oKm" inputmode="decimal" value="620"></label>
  </div>
  <div class="hs-sonuc" id="ySonuc"></div>
  <p class="hs-not">Gerçek tüketim; trafik, hız, klima kullanımı, lastik basıncı ve yükle değişir. Ortalama tüketimi en doğru biçimde depoyu fulleyip kilometre sayacını sıfırlayarak, bir sonraki fullemede alınan litreyi gidilen kilometreye bölerek bulursun.</p>
</div>
<script>(function(){${nfJs}var yon='yol';
function hesap(){var s=$('ySonuc');
if(yon==='ort'){var lt=sayi($('oLt').value),km=sayi($('oKm').value);if(!lt||!km){s.innerHTML='';return;}var o=lt/km*100;s.innerHTML='<div class="hs-buyuk"><span>Ortalama tüketim</span><b>'+nf2.format(o)+' lt/100 km</b></div><div class="hs-satir"><span>1 litreyle gidilen yol</span><b>'+nf2.format(km/lt)+' km</b></div>';return;}
var km2=sayi($('yKm').value)*($('yDonus').checked?2:1),t=sayi($('yTuk').value),f=sayi($('yFiyat').value),k=Math.max(1,parseInt($('yKisi').value)||1);if(!km2||!t){s.innerHTML='';return;}
var l=km2*t/100,h='<div class="hs-satir"><span>Toplam mesafe</span><b>'+nf.format(km2)+' km</b></div><div class="hs-satir"><span>Gereken yakıt</span><b>'+nf2.format(l)+' litre</b></div>';
if(f){var m=l*f;h='<div class="hs-buyuk"><span>Yakıt masrafı</span><b>'+nf2.format(m)+' TL</b></div>'+h+'<div class="hs-satir"><span>Kilometre başı maliyet</span><b>'+nf2.format(m/km2)+' TL</b></div>'+(k>1?'<div class="hs-satir"><span>Kişi başı ('+k+' kişi)</span><b>'+nf2.format(m/k)+' TL</b></div>':'');}else h+='<p class="hs-uyari">Masrafı görmek için yakıtın litre fiyatını yaz.</p>';s.innerHTML=h;}
$('yYon').onclick=function(e){var b=e.target.closest('button');if(!b)return;yon=b.dataset.v;[].forEach.call(this.children,function(x){x.classList.toggle('secili',x===b)});$('yYol').hidden=yon!=='yol';$('yOrt').hidden=yon!=='ort';hesap();};
['yKm','yTuk','yFiyat','yKisi','oLt','oKm'].forEach(function(i){$(i).oninput=hesap});$('yDonus').onchange=hesap;hesap();})();</script>`,
    bilgi: `<section class="rh-bas"><h2>Yakıt tüketimini düşürmenin kolay yolları</h2><p>Lastik basıncını üreticinin önerdiği değerde tutmak, ani hızlanma ve frenlemelerden kaçınmak, bagajdaki gereksiz yükü boşaltmak ve uzun yolda sabit hızla gitmek tüketimi gözle görülür biçimde azaltır. Bakımı aksatılmış bir motor ve tıkanmış hava filtresi ise tam tersine tüketimi artırır.</p>
<h2>Tüketim, aracın değerini de etkiler</h2><p>İkinci el piyasasında ekonomik motorlar her zaman daha hızlı alıcı bulur. OTOKABUL değerleme robotu, aracının motor ve yakıt tipini de hesaba katarak gerçekçi bir ön teklif çıkarır.</p></section>`,
    sss: [
      ['100 km\'de 6 litre yakan araç 450 km\'de ne kadar yakar?', '450 × 6 / 100 = 27 litre yakar. Masrafı bulmak için bu litreyi yakıtın litre fiyatıyla çarpman yeterlidir.'],
      ['Gerçek ortalama tüketimimi nasıl ölçerim?', 'Depoyu fulle ve kilometre sayacını sıfırla. Bir sonraki fullemede aldığın litreyi, aradaki kilometreye böl ve 100 ile çarp; sonuç litre/100 km cinsinden ortalamandır.'],
      ['Yakıt fiyatı neden hesaplayıcıya otomatik gelmiyor?', 'Akaryakıt fiyatları il, dağıtım şirketi ve gün içindeki zamlara göre değiştiği için OTOKABUL hesabı, istasyonda gördüğün güncel fiyatla yapmanı ister; böylece sonuç tam senin durumuna uyar.'],
    ],
  },

  'elektrikli-arac-sarj-hesaplama': {
    baslik: 'Elektrikli Araç Şarj Maliyeti ve Süresi Hesaplama | OTOKABUL',
    aciklama: 'Elektrikli aracının şarj maliyetini, şarj süresini ve 100 km\'lik yol masrafını OTOKABUL şarj hesaplayıcısıyla hemen öğren.',
    h1: 'Elektrikli Araç Şarj Hesaplama',
    giris: 'Evde ya da istasyonda şarj etmenin sana kaça mal olduğunu görmek için batarya kapasitesini, şarj aralığını ve kWh fiyatını gir; OTOKABUL hesaplayıcısı maliyeti ve yaklaşık süreyi çıkarsın.',
    arac: `<div class="hs-kutu">
  <div class="hs-alanlar">
    <label>Batarya kapasitesi (kWh)<input id="sKap" inputmode="decimal" value="60"></label>
    <label>Elektrik / şarj fiyatı (TL / kWh)<input id="sFiyat" inputmode="decimal" placeholder="Tarifendeki ya da istasyondaki fiyat"></label>
    <label>Başlangıç şarjı (%)<input id="sBas" inputmode="numeric" value="20"></label>
    <label>Hedef şarj (%)<input id="sHed" inputmode="numeric" value="80"></label>
    <label>Şarj gücü (kW)<input id="sGuc" inputmode="decimal" value="11"></label>
    <label>Şarj kaybı (%)<input id="sKayip" inputmode="numeric" value="10"></label>
    <label class="hs-tek">Aracın tüketimi (kWh / 100 km, isteğe bağlı)<input id="sTuk" inputmode="decimal" value="17"></label>
  </div>
  <div class="hs-sonuc" id="sSonuc"></div>
  <p class="hs-not">Süre yaklaşık değerdir: hızlı şarjda batarya %80'in üzerinde yavaş dolar; ev tipi prizde ve duvar tipi şarj ünitesinde güç, aracın dahili şarj cihazıyla sınırlıdır. Şarj kaybı, prizden çekilen enerjinin bataryaya ulaşmayan kısmıdır.</p>
</div>
<script>(function(){${nfJs}
function hesap(){var k=sayi($('sKap').value),f=sayi($('sFiyat').value),b=sayi($('sBas').value),h=sayi($('sHed').value),g=sayi($('sGuc').value),ky=sayi($('sKayip').value),t=sayi($('sTuk').value),s=$('sSonuc');
if(!k||h<=b){s.innerHTML='<p class="hs-uyari">Hedef şarj, başlangıçtan büyük olmalı.</p>';return;}
var e=k*(h-b)/100,cek=e/(1-Math.min(ky,50)/100),sure=g?cek/g:0,sa=Math.floor(sure),dk=Math.round((sure-sa)*60);
var x='<div class="hs-satir"><span>Bataryaya giren enerji</span><b>'+nf2.format(e)+' kWh</b></div><div class="hs-satir"><span>Şebekeden çekilen enerji</span><b>'+nf2.format(cek)+' kWh</b></div>'+(g?'<div class="hs-satir"><span>Yaklaşık şarj süresi</span><b>'+(sa?sa+' sa ':'')+dk+' dk</b></div>':'');
if(f){x='<div class="hs-buyuk"><span>Şarj maliyeti</span><b>'+nf2.format(cek*f)+' TL</b></div>'+x;if(t)x+='<div class="hs-satir"><span>100 km maliyeti</span><b>'+nf2.format(t/(1-Math.min(ky,50)/100)*f)+' TL</b></div><div class="hs-satir"><span>Bu şarjla yaklaşık menzil</span><b>'+nf.format(Math.round(e/t*100))+' km</b></div>';}
else x+='<p class="hs-uyari">Maliyeti görmek için kWh fiyatını yaz.</p>';s.innerHTML=x;}
['sKap','sFiyat','sBas','sHed','sGuc','sKayip','sTuk'].forEach(function(i){$(i).oninput=hesap});hesap();})();</script>`,
    bilgi: `<section class="rh-bas"><h2>Evde mi, istasyonda mı şarj daha uygun?</h2><p>Ev tarifesiyle yapılan şarj, kilovatsaat başına genellikle hızlı şarj istasyonlarından çok daha ucuzdur; buna karşılık daha uzun sürer. Uzun yolda zaman kazandıran DC hızlı şarj ise kilovatsaat başına en pahalı seçenektir. Hesaplayıcıya iki fiyatı ayrı ayrı yazarak farkı kendin görebilirsin.</p>
<h2>Bataryayı neden %80'e kadar doldurmak öneriliyor?</h2><p>Lityum iyon bataryalar %20 – %80 aralığında daha az yıpranır ve hızlı şarjda bu aralık en verimli bölgedir. Günlük kullanımda %80 sınırı batarya sağlığını korur; batarya sağlığı ise ikinci elde aracın değerini doğrudan etkiler. OTOKABUL elektrikli araçları değerlendirirken batarya durumunu da dikkate alır.</p></section>`,
    sss: [
      ['60 kWh bataryayı %20\'den %80\'e şarj etmek ne kadar enerji ister?', 'Bataryaya 36 kWh girer. %10 şarj kaybıyla şebekeden yaklaşık 40 kWh çekilir; maliyet bu değerin kWh fiyatıyla çarpımıdır.'],
      ['Şarj süresi neden hesaplanandan uzun sürebilir?', 'Batarya doldukça şarj gücü düşer, soğuk havada batarya ısınana kadar şarj yavaşlar ve aracın dahili şarj cihazı istasyondan daha düşük güç kabul edebilir.'],
      ['Elektrikli aracımı OTOKABUL\'a satabilir miyim?', 'Evet. Değerleme robotunda markanı ve modelini seçerek elektrikli aracının ön teklifini birkaç dakikada görebilirsin.'],
    ],
  },

  'kw-hp-donusturme': {
    baslik: 'kW Beygir (HP) Çevirme — Motor Gücü Hesaplama | OTOKABUL',
    aciklama: 'Motor gücünü kilovattan beygire (PS/HP), beygirden kilovata OTOKABUL ile anında çevir; ruhsattaki kW değerinin kaç beygir ettiğini öğren.',
    h1: 'kW – Beygir (HP) Çevirme',
    giris: 'Ruhsatta motor gücü kilovat (kW) olarak yazar, ilanlarda ise genellikle beygir kullanılır. OTOKABUL çeviricisiyle iki birim arasında saniyeler içinde geçiş yaparsın.',
    arac: `<div class="hs-kutu">
  <div class="hs-alanlar">
    <label>Kilovat (kW)<input id="kKw" inputmode="decimal" value="85"></label>
    <label>Beygir (PS / metrik HP)<input id="kPs" inputmode="decimal"></label>
  </div>
  <div class="hs-sonuc" id="kSonuc"></div>
  <p class="hs-not">Türkiye'de ve Avrupa'da "beygir" denince metrik beygir (PS) kastedilir: 1 kW = 1,35962 PS. ABD'de kullanılan mekanik beygir (hp) biraz farklıdır: 1 kW = 1,34102 hp.</p>
</div>
<script>(function(){${nfJs}var PS=1.35962,HP=1.34102;var nf1=new Intl.NumberFormat('tr-TR',{maximumFractionDigits:1});
function sonuc(kw){$('kSonuc').innerHTML=kw?'<div class="hs-buyuk"><span>'+nf1.format(kw)+' kW</span><b>'+nf1.format(kw*PS)+' PS</b></div><div class="hs-satir"><span>Mekanik beygir (hp)</span><b>'+nf1.format(kw*HP)+' hp</b></div><div class="hs-satir"><span>Yuvarlanmış (ilanlarda yazılan)</span><b>'+Math.round(kw*PS)+' beygir</b></div>':'';}
$('kKw').oninput=function(){var k=sayi(this.value);$('kPs').value=k?nf1.format(k*PS):'';sonuc(k);};
$('kPs').oninput=function(){var p=sayi(this.value);$('kKw').value=p?nf1.format(p/PS):'';sonuc(p/PS);};
$('kKw').oninput();})();</script>`,
    bilgi: `<section class="rh-bas"><h2>Sık kullanılan değerler</h2><div class="hs-tablo-kap"><table class="hs-tablo"><thead><tr><th>kW</th><th>Beygir (PS)</th><th>kW</th><th>Beygir (PS)</th></tr></thead><tbody>${[[55, 66], [70, 85], [81, 92], [96, 100], [110, 120], [125, 150]].map(([a, b]) => `<tr><td>${a} kW</td><td>${Math.round(a * 1.35962)} PS</td><td>${b} kW</td><td>${Math.round(b * 1.35962)} PS</td></tr>`).join('')}</tbody></table></div>
<h2>Motor gücü aracın değerini nasıl etkiler?</h2><p>Aynı modelin farklı motor seçenekleri ikinci elde farklı fiyatlarla alınıp satılır. OTOKABUL değerleme robotu, aracının donanım paketini ve motorunu seçmeni istediği için teklifin, aracının gerçek özelliklerine göre hesaplanır.</p></section>`,
    sss: [
      ['1 kW kaç beygir eder?', '1 kW yaklaşık 1,36 metrik beygirdir (PS). Örneğin ruhsatında 81 kW yazan bir araç yaklaşık 110 beygirdir.'],
      ['Ruhsatta motor gücü nerede yazar?', 'Yeni tip ruhsatlarda motor gücü kilovat (kW) cinsinden "P.2" alanında yazar.'],
      ['PS ile hp aynı şey mi?', 'Çok yakın ama aynı değil. PS metrik beygirdir ve Türkiye\'de kullanılır; hp mekanik beygirdir ve PS\'den yaklaşık %1,4 düşük bir değer verir.'],
    ],
  },

  'lastik-ebadi-hesaplama': {
    baslik: 'Lastik Ebadı Hesaplama — Çap Farkı ve Hız Sapması | OTOKABUL',
    aciklama: 'İki lastik ebadını karşılaştır: çap, yanak yüksekliği, çevre ve hız göstergesi sapmasını OTOKABUL lastik hesaplayıcısıyla anında gör.',
    h1: 'Lastik Ebadı Hesaplama ve Karşılaştırma',
    giris: 'Jant ya da lastik değiştirmeden önce yeni ebadın aracına uyup uymadığını kontrol etmek önemlidir. OTOKABUL lastik hesaplayıcısı mevcut ve yeni ebadı karşılaştırır, hız göstergesinde oluşacak sapmayı gösterir.',
    arac: `<div class="hs-kutu">
  <div class="hs-alanlar">
    <label>Mevcut lastik (ör. 205/55 R16)<input id="lA" value="205/55 R16"></label>
    <label>Yeni lastik (ör. 225/45 R17)<input id="lB" value="225/45 R17"></label>
  </div>
  <div class="hs-sonuc" id="lSonuc"></div>
  <p class="hs-not">Genel kabul gören sınır, toplam çap farkının ±%3'ü geçmemesidir. Daha büyük farklar hız göstergesini, ABS/ESP sistemlerini ve sigorta durumunu etkileyebilir; değişiklikten önce aracının ruhsatında ve üretici onaylı ebat listesinde yer aldığını kontrol et.</p>
</div>
<script>(function(){${nfJs}var nf1=new Intl.NumberFormat('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1});
function coz(s){var m=/(\\d{3})\\s*\\/\\s*(\\d{2})\\s*[A-Za-z]*\\s*(\\d{2}(?:[.,]5)?)/.exec(String(s));if(!m)return null;var w=+m[1],a=+m[2],r=parseFloat(m[3].replace(',','.'));var yan=w*a/100,cap=r*25.4+2*yan;return{w:w,a:a,r:r,yan:yan,cap:cap,cev:cap*Math.PI};}
function hesap(){var A=coz($('lA').value),B=coz($('lB').value),s=$('lSonuc');if(!A||!B){s.innerHTML='<p class="hs-uyari">Ebatları 205/55 R16 biçiminde yaz.</p>';return;}
var f=(B.cap-A.cap)/A.cap*100,gercek=100*B.cap/A.cap,uy=Math.abs(f)<=3;
s.innerHTML='<div class="hs-buyuk"><span>Çap farkı</span><b>'+(f>0?'+':'')+nf1.format(f)+' %</b></div><p class="'+(uy?'hs-ok':'hs-uyari')+'">'+(uy?'Fark ±%3 sınırının içinde.':'Fark ±%3 sınırını aşıyor; bu ebadı takmadan önce mutlaka üretici onayını kontrol et.')+'</p>'+
'<table class="hs-tablo hs-kars"><thead><tr><th></th><th>Mevcut</th><th>Yeni</th></tr></thead><tbody><tr><td>Toplam çap</td><td>'+nf1.format(A.cap)+' mm</td><td>'+nf1.format(B.cap)+' mm</td></tr><tr><td>Yanak yüksekliği</td><td>'+nf1.format(A.yan)+' mm</td><td>'+nf1.format(B.yan)+' mm</td></tr><tr><td>Çevre</td><td>'+nf.format(Math.round(A.cev))+' mm</td><td>'+nf.format(Math.round(B.cev))+' mm</td></tr><tr><td>Taban genişliği</td><td>'+A.w+' mm</td><td>'+B.w+' mm</td></tr></tbody></table>'+
'<div class="hs-satir"><span>Gösterge 100 km/s iken gerçek hız</span><b>'+nf1.format(gercek)+' km/s</b></div>';}
$('lA').oninput=hesap;$('lB').oninput=hesap;hesap();})();</script>`,
    bilgi: `<section class="rh-bas"><h2>Lastik ebadı nasıl okunur?</h2><p>205/55 R16 ebadında 205, lastiğin milimetre cinsinden taban genişliğidir. 55, yanak yüksekliğinin genişliğe oranıdır (yani yanak 205 mm'nin %55'i kadardır). R radyal yapıyı, 16 ise jant çapını inç olarak gösterir. Toplam çap, jant çapına iki yanak yüksekliği eklenerek bulunur.</p>
<h2>Lastikler aracın değerini etkiler mi?</h2><p>Dişi azalmış ya da farklı ebatlarda karışık takılmış lastikler, ekspertizde masraf kalemi olarak görülür. OTOKABUL ekspertizinde lastiklerin durumu da kontrol edilir ve teklife açıkça yansıtılır.</p></section>`,
    sss: [
      ['Lastik çap farkı en fazla ne kadar olmalı?', 'Genel kabul gören sınır ±%3\'tür. Bu sınırın üzerindeki farklar hız göstergesini ve sürüş güvenliği sistemlerini etkileyebilir.'],
      ['Daha büyük jant takınca hız göstergesi değişir mi?', 'Toplam çap korunursa değişmez. Jant büyürken yanak oranı düşürülürse (ör. 205/55 R16 yerine 225/45 R17) toplam çap neredeyse aynı kalır.'],
      ['Ruhsatta yazmayan lastik ebadı takılabilir mi?', 'Üreticinin onay vermediği ebatlar muayenede sorun çıkarabilir. Değişiklik öncesi aracının uygun ebat listesini kontrol etmen önerilir.'],
    ],
  },

  'yillik-km-hesaplama': {
    baslik: 'Yıllık Ortalama Km Hesaplama — Aracım Yılda Kaç Km Yapmış? | OTOKABUL',
    aciklama: 'Aracının kilometresini ve model yılını gir; yılda, ayda ve günde ortalama kaç km yaptığını OTOKABUL ile hemen gör.',
    h1: 'Yıllık Ortalama Kilometre Hesaplama',
    giris: 'Aracının yaşına göre çok mu yoksa az mı yol yaptığını merak ediyorsan bu hesaplayıcı tam sana göre. Kilometre, OTOKABUL değerlemesinde fiyatı belirleyen en önemli bilgilerden biridir.',
    arac: `<div class="hs-kutu">
  <div class="hs-alanlar">
    <label>Güncel kilometre<input id="yKm2" inputmode="numeric" value="120.000"></label>
    <label>İlk tescil (trafiğe çıkış) yılı<select id="yYil"></select></label>
  </div>
  <div class="hs-sonuc" id="ySonuc2"></div>
  <p class="hs-not">Hesap, aracın trafiğe çıktığı yılın ortasından bugüne geçen süreye göre yapılır; bu yüzden tam tarih bilinmediğinde de gerçeğe yakın sonuç verir.</p>
</div>
<script>(function(){${nfJs}var bu=new Date(),ys=$('yYil');for(var y=bu.getFullYear();y>=bu.getFullYear()-35;y--){var o=document.createElement('option');o.value=y;o.textContent=y;ys.appendChild(o);}ys.value=bu.getFullYear()-6;
function hesap(){var km=sayi($('yKm2').value),y=+ys.value,yil=Math.max(0.25,(bu-new Date(y,6,1))/(365.25*864e5)),s=$('ySonuc2');if(!km){s.innerHTML='';return;}var yi=km/yil;
s.innerHTML='<div class="hs-buyuk"><span>Yıllık ortalama</span><b>'+nf.format(Math.round(yi))+' km</b></div><div class="hs-satir"><span>Aylık ortalama</span><b>'+nf.format(Math.round(yi/12))+' km</b></div><div class="hs-satir"><span>Günlük ortalama</span><b>'+nf.format(Math.round(yi/365))+' km</b></div><div class="hs-satir"><span>Hesaba esas süre</span><b>'+nf2.format(yil)+' yıl</b></div>';}
$('yKm2').oninput=function(){var n=sayi(this.value);this.value=n?nf.format(n):'';hesap();};ys.onchange=hesap;hesap();})();</script>`,
    bilgi: `<section class="rh-bas"><h2>Kilometre ikinci el fiyatı nasıl etkiler?</h2><p>Aynı yaştaki iki araçtan kilometresi düşük olan genellikle daha yüksek fiyat bulur; çünkü motor, şanzıman ve süspansiyon daha az yıpranmıştır. Ancak çok düşük kilometre tek başına yeterli değildir: düzenli bakım geçmişi, kilometrenin tutarlılığı ve aracın genel durumu da en az kilometre kadar önemlidir.</p>
<h2>OTOKABUL kilometreyi nasıl değerlendirir?</h2><p>Değerleme robotuna girdiğin kilometre, aracının yaşı ve segmentindeki benzer araçlarla birlikte değerlendirilir. Ekspertizde kilometrenin tutarlılığı kontrol edilir; tutarlı ve bakımlı araçlar teklifte hak ettiği karşılığı bulur.</p></section>`,
    sss: [
      ['Yıllık ortalama km nasıl hesaplanır?', 'Aracın toplam kilometresi, trafiğe çıktığı tarihten bugüne geçen yıl sayısına bölünür. Örneğin 6 yılda 120.000 km yapan araç yılda ortalama 20.000 km yapmıştır.'],
      ['Yüksek kilometreli aracımı satabilir miyim?', 'Elbette. OTOKABUL yüksek kilometreli araçlara da teklif verir; bakım geçmişi düzenli araçlar kilometre yüksek olsa da iyi değer bulur.'],
      ['Kilometre bilgisini nereden doğrulayabilirim?', 'Muayene kayıtları ve servis geçmişi kilometrenin tutarlılığını görmek için en güvenilir kaynaklardır. OTOKABUL ekspertizi de bu kontrolü içerir.'],
    ],
  },

  'plaka-il-kodlari': {
    baslik: 'Plaka İl Kodları — 01\'den 81\'e Tüm İller | OTOKABUL',
    aciklama: 'Türkiye plaka il kodları listesi: 01 Adana\'dan 81 Düzce\'ye tüm illerin plaka kodlarını OTOKABUL\'da ara ve hemen bul.',
    h1: 'Plaka İl Kodları Listesi',
    giris: 'Yolda gördüğün bir plakanın hangi ile ait olduğunu merak ettiysen aşağıdaki kutuya kodu ya da il adını yazman yeterli. OTOKABUL listesinde 81 ilin tamamı yer alır.',
    arac: `<div class="hs-kutu">
  <div class="hs-alanlar"><label class="hs-tek">Kod ya da il adı<input id="pAra" placeholder="ör. 34 ya da Bursa" autocomplete="off"></label></div>
  <div class="hs-plaka-iz" id="pListe"></div>
</div>
<script>(function(){var I='Adana,Adıyaman,Afyonkarahisar,Ağrı,Amasya,Ankara,Antalya,Artvin,Aydın,Balıkesir,Bilecik,Bingöl,Bitlis,Bolu,Burdur,Bursa,Çanakkale,Çankırı,Çorum,Denizli,Diyarbakır,Edirne,Elazığ,Erzincan,Erzurum,Eskişehir,Gaziantep,Giresun,Gümüşhane,Hakkâri,Hatay,Isparta,Mersin,İstanbul,İzmir,Kars,Kastamonu,Kayseri,Kırklareli,Kırşehir,Kocaeli,Konya,Kütahya,Malatya,Manisa,Kahramanmaraş,Mardin,Muğla,Muş,Nevşehir,Niğde,Ordu,Rize,Sakarya,Samsun,Siirt,Sinop,Sivas,Tekirdağ,Tokat,Trabzon,Tunceli,Şanlıurfa,Uşak,Van,Yozgat,Zonguldak,Aksaray,Bayburt,Karaman,Kırıkkale,Batman,Şırnak,Bartın,Ardahan,Iğdır,Yalova,Karabük,Kilis,Osmaniye,Düzce'.split(',');
var L=document.getElementById('pListe'),A=document.getElementById('pAra');function k(i){return(i<9?'0':'')+(i+1)}
function ciz(){var q=A.value.trim().toLocaleLowerCase('tr');L.innerHTML=I.map(function(ad,i){return[k(i),ad]}).filter(function(x){return!q||x[0].indexOf(q)===0||String(+x[0])===q||x[1].toLocaleLowerCase('tr').indexOf(q)>=0}).map(function(x){return'<div class="hs-plaka"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>'}).join('')||'<p class="hs-uyari">Eşleşen il bulunamadı.</p>';}
A.oninput=ciz;ciz();})();</script>`,
    bilgi: `<section class="rh-bas"><h2>Plaka kodları nasıl belirlendi?</h2><p>İlk 67 il kodu, kodların verildiği dönemde illerin alfabetik sırasına göre dağıtılmıştır; bu yüzden 01 Adana, 06 Ankara, 34 İstanbul'dur. Sonradan il olan yerler sıradaki numaraları almıştır: 68 Aksaray'dan başlayıp 81 Düzce'ye kadar uzanan kodlar bu şekilde verilmiştir. 33 Mersin ile 46 Kahramanmaraş ve 63 Şanlıurfa'nın alfabetik sırada görünmemesi, bu illerin eski adlarından (İçel, Maraş, Urfa) kaynaklanır.</p>
<h2>Aracının plakası başka ilden mi?</h2><p>OTOKABUL, hizmet bölgesindeki illerden aracını alırken plakanın hangi ile ait olduğuna bakmaz; noter devrinde plaka işlemleri de bizim tarafımızdan takip edilir.</p></section>`,
    sss: [
      ['34 hangi ilin plakası?', '34 İstanbul\'un plaka kodudur.'],
      ['En son verilen plaka kodu hangisi?', 'En son il olan Düzce\'ye 81 kodu verilmiştir.'],
      ['Başka ilin plakasıyla aracımı OTOKABUL\'a satabilir miyim?', 'Evet. Aracının bulunduğu il hizmet bölgemizdeyse plakanın hangi ile ait olduğu fark etmez; devir ve plaka işlemlerini OTOKABUL yürütür.'],
    ],
  },
};

export function aracSayfaVeri(slug) { return SAYFALAR[slug] || null; }
export function aracGovde(slug, h, cta, faqHtml) {
  const s = SAYFALAR[slug];
  return `<section class="rh-bas"><h1>${h(s.h1)}</h1><p>${h(s.giris)}</p></section>
${reklamUst(h)}
${s.arac}
${cta('Hesabı yaptın, şimdi aracının değerini öğren', '/#degerle')}
${s.bilgi}
${faqHtml(s.sss)}
${reklamKart()}
${digerleri(h, slug)}`;
}
export function hesaplamalarGovde(h) {
  return `<section class="rh-bas"><h1>Otomobil Hesaplama Araçları</h1><p>Araç sahiplerinin en çok ihtiyaç duyduğu hesaplamaları OTOKABUL'da tek yerde topladık. Vergiden muayeneye, yakıttan lastiğe kadar merak ettiğini hesapla; aracının değerini öğrenmek istediğinde de değerleme robotumuz bir tık uzağında.</p></section>
${reklamUst(h)}
<section class="hs-diger hs-merkez"><div class="hs-diger-iz">${ARACLAR.map((a) => `<a href="/${a.slug}/"><span>${a.ikon}</span><b>${h(a.ad)}</b><small>${h(a.kisa)}</small></a>`).join('')}<a class="hs-diger-robot" href="/#degerle"><span>🤖</span><b>Araç değerleme robotu</b><small>Aracının değerini 2 dakikada öğren</small></a></div></section>
${reklamKart()}`;
}
