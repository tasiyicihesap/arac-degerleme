// OTOKABUL — araç satan kişiler için rehber yazıları (/rehber/)
// Her yazı: slug, baslik, aciklama, ozet, tarih, govde (HTML), sss
export const YAZILAR = [
  {
    slug: 'aracini-sattiktan-sonra-yapman-gerekenler',
    baslik: 'Aracını Sattıktan Sonra Yapman Gereken 8 İş',
    aciklama: 'Araç satışından sonra trafik sigortası ve kasko iadesi, HGS/OGS etiketi, e-Devlet kontrolü, kişisel verilerin silinmesi ve diğer adımlar. Noterden çıktıktan sonra kontrol listesi.',
    ozet: 'Sigorta iadesinden HGS etiketine, telefon eşleşmelerinden e-Devlet kontrolüne: noterden çıktıktan sonraki kontrol listesi.',
    tarih: '2026-11-22',
    govde: `
<p>Noterde imzalar atıldı, ödeme hesabına geçti; satış bitti sanılır. Oysa birkaç küçük iş daha var. Bunları ihmal etmek, hiç kullanmayacağın bir sigortanın primini boşa bırakmana ya da eski aracından gelen bir bildirimle uğraşmana yol açabilir. Aşağıdaki sekiz adım, OTOKABUL olarak satış sonrası müşterilerimize hatırlattığımız kontrol listesidir.</p>
<h2>1. Trafik sigortanın kullanılmayan süresini geri iste</h2>
<p>Zorunlu trafik sigortası araca bağlıdır ve satışla birlikte sona erer. Poliçenin dolmamış süresine ait primin iadesi için sigorta şirketine ya da acentene noter satış belgesiyle başvurman yeterlidir. Başvurmazsan iade kendiliğinden yatmayabilir.</p>
<h2>2. Kaskonu iptal ettir ya da yeni aracına aktar</h2>
<p>Kasko poliçesi de satışla birlikte anlamını yitirir. Sigorta şirketin, kullanılmayan süreye karşılık gelen tutarı iade edebilir ya da yeni bir araç alacaksan poliçeyi o araca uyarlama seçeneği sunabilir. Hangisinin senin için daha avantajlı olduğunu acentene sor.</p>
<h2>3. HGS ya da OGS etiketini iptal ettir</h2>
<p>Geçiş etiketleri plakaya tanımlıdır. Etiket iptal edilmezse yeni sahibin geçişleri senin bakiyenden düşebilir. Etiketi aldığın kurumun uygulamasından ya da şubesinden iptal ettirip kalan bakiyeni yeni etiketine veya hesabına aktarabilirsin.</p>
<h2>4. e-Devlet'te aracın adından çıktığını kontrol et</h2>
<p>Satıştan kısa bir süre sonra e-Devlet'teki "Adıma Kayıtlı Araç Sorgulama" ekranına bakarak aracın kaydının senden çıktığını görebilirsin. Bu, satışın resmî olarak tamamlandığının en kolay teyididir.</p>
<h2>5. Telefon ve multimedya kayıtlarını sil</h2>
<p>Bluetooth ile eşleştirdiğin telefonlar, rehberinden aktarılan kişiler, navigasyondaki ev ve iş adresleri aracın ekranında kalabilir. Teslimden önce multimedya sisteminden fabrika ayarlarına dönmek ya da kayıtları tek tek silmek kişisel bilgilerini korur. Unuttuysan uzmanlarımıza söylemen yeterli.</p>
<h2>6. Bağlı uygulama ve hizmetleri kapat</h2>
<p>Bazı araçlar üreticinin mobil uygulamasına, uzaktan kilit ya da konum hizmetine bağlıdır. Bu hesaplardan aracı kaldır. Araç takip cihazı, otopark aboneliği ya da site giriş kartı gibi plakaya veya araca bağlı kayıtları da iptal ettirmeyi unutma.</p>
<h2>7. Araçta kişisel eşya ve belge kalmadığından emin ol</h2>
<p>Torpido, kapı cepleri, koltuk altları ve bagajın altındaki stepne bölmesi en sık eşya unutulan yerlerdir. Yedek anahtarın, servis kitapçığının ve varsa kışlık lastiklerin teslim edildiğini de kontrol et.</p>
<h2>8. Satış belgelerini sakla</h2>
<p>Noter satış sözleşmesini ve ödeme dekontunu bir süre saklamak, ileride çıkabilecek bir trafik cezası ya da bildirim karşısında satış tarihini kanıtlamanı kolaylaştırır. Satış tarihinden sonraki cezalar yeni sahibine aittir; belgen bunu göstermenin en kısa yoludur.</p>
<p>OTOKABUL'a aracını satan müşterilerimize bu listeyi teslim günü hatırlatıyoruz. Aracını satmayı düşünüyorsan önce ücretsiz ön teklifini gör, gerisini birlikte planlayalım.</p>`,
    sss: [
      ['Araç satılınca trafik sigortası parası geri alınır mı?', 'Trafik sigortası satışla sona erer; dolmamış süreye ait prim için sigorta şirketine noter satış belgesiyle başvurman gerekir. İade tutarını ve süresini sigorta şirketin belirler.'],
      ['Satıştan sonra gelen trafik cezasını kim öder?', 'Satış tarihinden sonraki cezalar aracın yeni sahibine aittir. Noter satış sözleşmen, cezanın satıştan sonra yazıldığını gösteren belgedir; bu yüzden sözleşmeni saklamanı öneririz.'],
    ],
  },
  {
    slug: 'aracini-satmadan-once-yapman-gerekenler',
    baslik: 'Aracını Satmadan Önce Yapman Gereken 7 Şey',
    aciklama: 'Aracını satmadan önce hazırlaman gerekenler: bakım kayıtları, temizlik, küçük kusurlar, piyasa değeri ve doğru alıcıyı seçmek. Daha iyi fiyat için kısa kontrol listesi.',
    ozet: 'Bakım kayıtlarından küçük kusurlara, piyasa değerini öğrenmekten doğru alıcıyı seçmeye kadar satış öncesi kontrol listesi.',
    tarih: '2026-11-16',
    govde: `
<p>Aynı model iki araçtan biri neden diğerinden daha yüksek fiyata satılır? Çoğu zaman cevap aracın kendisinde değil, satış öncesindeki hazırlıktadır. Aşağıdaki yedi adım hem daha iyi fiyat almana hem de süreci hızlandırmana yardım eder.</p>
<h2>1. Aracının bugünkü piyasa değerini öğren</h2>
<p>Fiyatı tahminle belirlemek ya iyi bir alıcıyı kaçırmana ya da aracını değerinin altında vermene yol açar. Satışa karar vermeden önce marka, model, yıl, motor-paket ve kilometre bilgisiyle güncel değeri gör. OTOKABUL değerleme ekranında bu bilgi birkaç dakikada, ücretsiz olarak çıkar.</p>
<h2>2. Bakım ve servis kayıtlarını bir araya getir</h2>
<p>Düzenli bakım yapılmış bir araç, alıcıya “bu araca iyi bakılmış” mesajını verir. Servis faturaları, yağ değişim fişleri, lastik ve akü değişimleri gibi belgeleri bir dosyada topla. Kayıt ne kadar eksiksizse güven o kadar artar.</p>
<h2>3. Hasar ve boya-değişen bilgisini dürüstçe hazırla</h2>
<p>Boya, değişen parça ve tramer kaydı ekspertizde zaten ortaya çıkar. Bunları baştan doğru bildirmek, ön teklif ile kesin teklif arasındaki farkı küçültür ve pazarlığı kısaltır.</p>
<h2>4. İç ve dış temizliği ihmal etme</h2>
<p>Temiz bir araç daha bakımlı görünür. Koltuklar, paspaslar, bagaj ve torpido gözü boşaltılıp temizlendiğinde ilk izlenim belirgin biçimde iyileşir.</p>
<h2>5. Küçük kusurları değerlendir</h2>
<p>Yanan bir ampul, eksik bir paspas ya da biten silecek suyu gibi ucuz eksikler, alıcının gözünde gereğinden büyük görünebilir. Masrafı düşük olanları gidermek çoğu zaman kendini fazlasıyla öder. Büyük onarımlarda ise önce değerlemeyi görmek daha akıllıcadır.</p>
<h2>6. Ruhsat ve kişisel eşyalarını kontrol et</h2>
<p>Ruhsatın yanında olduğundan, araçta kişisel eşya ya da belge kalmadığından emin ol. Noter satışında gereken belgeleri uzmanımız randevudan önce sana tek tek bildirir.</p>
<h2>7. Satış yolunu seç: ilan mı, doğrudan satış mı?</h2>
<p>İlanla satış daha uzun sürer; telefon trafiği, tanımadığın kişilerle randevular ve uzun pazarlıklar gerektirir. Doğrudan satışta ise ücretsiz ekspertiz, noter işlemlerinin takibi ve aynı gün ödeme ile süreç tek seferde tamamlanır. Hangisinin sana uygun olduğunu zaman ve güven ihtiyacına göre seçebilirsin.</p>`,
    sss: [
      ['Aracımı satmadan önce bakım yaptırmalı mıyım?', 'Masrafı düşük, görünür eksikleri gidermek genellikle faydalıdır. Büyük ve pahalı onarımlara girmeden önce güncel değerlemeyi görmen daha doğru karar vermeni sağlar.'],
      ['Satış için hangi belgeler gerekiyor?', 'Noter satışı için gereken belgeleri uzmanımız randevudan önce sana tek tek bildirir; eksik bir şey kalmaması için süreci birlikte planlarız.'],
    ],
  },
  {
    slug: 'ekspertiz-raporu-nedir',
    baslik: 'Ekspertiz Raporu Nedir? Aracını Satarken Neden Önemlidir?',
    aciklama: 'Ekspertiz raporunda neler yer alır, satıcıya ne kazandırır? Teknik durum, boya-değişen ve hasar geçmişi kontrolünün satış fiyatına etkisi.',
    ozet: 'Ekspertiz raporunun içeriği, satıcıya sağladığı güven ve kesin teklife etkisi.',
    tarih: '2026-11-16',
    govde: `
<p>Ekspertiz, bir aracın teknik durumunun ve geçmişinin bağımsız biçimde kontrol edilip rapora dökülmesidir. Alıcı için bir güvence olduğu kadar, satıcı için de aracının gerçek değerini belgeleyen bir dayanaktır.</p>
<h2>Ekspertiz raporunda neler yer alır?</h2>
<ul>
<li><b>Kaporta ve boya:</b> Hangi parçaların boyalı, lokal boyalı ya da değişen olduğu.</li>
<li><b>Motor ve mekanik:</b> Motor, şanzıman, yürüyen aksam ve fren sistemlerinin genel durumu.</li>
<li><b>Elektronik:</b> Arıza kayıtları ve elektronik sistemlerin çalışması.</li>
<li><b>Hasar geçmişi:</b> Tramer kayıtları ve daha önce yapılmış onarımların izleri.</li>
</ul>
<h2>Satıcı olarak sana ne kazandırır?</h2>
<p>Rapor, aracının durumunu tartışmaya yer bırakmayacak şekilde ortaya koyar. Bakımlı ve hasarsız bir aracın değeri belgeyle desteklenir; pazarlık “bana öyle geldi” yerine somut bilgiye dayanır. Kusurlar varsa, bunların fiyata etkisi de açık ve ölçülü biçimde konuşulur.</p>
<h2>Ön teklif ile kesin teklif arasındaki bağ</h2>
<p>Ön teklif, senin verdiğin bilgilere göre hesaplanır. Ekspertiz bu bilgileri doğrular. Bildirdiklerin doğruysa kesin teklif ön teklif aralığında kalır; bildirilmemiş bir hasar ya da arıza çıkarsa teklif buna göre güncellenir. Bu yüzden değerleme ekranında boya-değişen ve tramer bilgisini doğru girmek en kısa yoldur.</p>
<h2>OTOKABUL’da ekspertiz ücretli mi?</h2>
<p>Hayır. Ön teklif içine sinerse aracını ücretsiz ekspertizden geçiririz ve kesin teklifimizi raporla birlikte açıkça paylaşırız. Teklifi kabul etmek zorunda değilsin.</p>`,
    sss: [
      ['Ekspertiz ne kadar sürer?', 'Kapsama göre değişmekle birlikte genellikle birkaç saat içinde tamamlanır; randevuyu sana uygun saate göre planlarız.'],
      ['Ekspertiz sonrası teklifi kabul etmek zorunda mıyım?', 'Hayır. Ekspertiz ücretsizdir ve kesin teklifi kabul edip etmemek tamamen sana kalmıştır.'],
    ],
  },
  {
    slug: 'boya-degisen-tramer-fiyata-etkisi',
    baslik: 'Boya, Değişen ve Tramer Kaydı Aracın Fiyatını Nasıl Etkiler?',
    aciklama: 'Lokal boya, komple boya, değişen parça ve tramer kaydının ikinci el araç fiyatına etkisi. Hangi parçalar değeri daha çok etkiler, satarken nelere dikkat etmeli?',
    ozet: 'Boyalı ve değişen parçalar ile tramer kaydının araç değerine etkisini sade bir dille anlattık.',
    tarih: '2026-11-16',
    govde: `
<p>İkinci el araç fiyatını belirleyen en önemli etkenlerden biri aracın kaporta geçmişidir. Aynı yıl ve kilometredeki iki araç arasında, yalnızca boya-değişen durumu yüzünden belirgin bir fiyat farkı oluşabilir.</p>
<h2>Lokal boya, komple boya ve değişen arasındaki fark</h2>
<ul>
<li><b>Lokal boya:</b> Bir parçanın yalnızca küçük bir bölgesi boyanmıştır; çizik ve sürtme onarımlarında sık görülür. Fiyata etkisi genellikle sınırlıdır.</li>
<li><b>Boyalı parça:</b> Parçanın tamamı boyanmıştır. Etkisi parçanın konumuna ve sayısına göre artar.</li>
<li><b>Değişen parça:</b> Parça yenisiyle değiştirilmiştir. Özellikle taşıyıcı ve yapısal bölgelerde değeri daha çok etkiler.</li>
</ul>
<h2>Hangi parçalar daha çok önemlidir?</h2>
<p>Kapı, çamurluk ve kaput gibi sökülüp takılabilen parçalardaki işlemler daha sık karşılaşılan durumlardır. Tavan, direkler, şasi ve podye gibi aracın iskeletini oluşturan bölgelerdeki işlemler ise güvenlik açısından önemli olduğu için değeri çok daha fazla etkiler.</p>
<h2>Tramer kaydı ne anlatır?</h2>
<p>Tramer, araca ait sigorta hasar kayıtlarını gösterir. Kaydın tutarı tek başına her şeyi söylemez; hasarın hangi parçada olduğu ve nasıl onarıldığı da önemlidir. Küçük tutarlı ve iyi onarılmış bir kayıt, yüksek tutarlı ve yapısal bir hasardan çok farklı değerlendirilir.</p>
<h2>Satarken nasıl davranmalısın?</h2>
<p>Boya-değişen ve tramer bilgisini değerleme ekranına doğru girmek, gerçekçi bir ön teklif almanı sağlar. Bu bilgiler ekspertizde zaten ortaya çıkacağı için baştan doğru bildirmek, son anda fiyat değişikliğinin önüne geçer.</p>`,
    sss: [
      ['Lokal boya fiyatı çok düşürür mü?', 'Genellikle sınırlı bir etkisi olur. Parçanın konumu ve aracın genel durumu birlikte değerlendirilir.'],
      ['Tramer kaydı olan aracı satabilir miyim?', 'Evet. Tramer kaydı olan araçları da değerlendiriyoruz; kaydın tutarı ve hasarın yeri fiyata yansıtılır.'],
    ],
  },
  {
    slug: 'kilometre-arac-degerini-nasil-etkiler',
    baslik: 'Kilometre Aracın Değerini Nasıl Etkiler?',
    aciklama: 'Yüksek ve düşük kilometrenin ikinci el araç fiyatına etkisi, yıllık ortalama kilometre ve kilometre düşürmenin neden ortaya çıktığı. Satış öncesi bilmen gerekenler.',
    ozet: 'Yıllık ortalama kilometre, yüksek kilometrenin değere etkisi ve kilometre düşürmenin neden kısa yoldan ortaya çıktığı.',
    tarih: '2026-11-16',
    govde: `
<p>Kilometre, ikinci el bir aracın ne kadar kullanıldığını gösteren en hızlı ölçüdür. Ancak tek başına bir hüküm vermez; aracın yaşı, bakım geçmişi ve kullanım şekliyle birlikte değerlendirilir.</p>
<h2>Yıllık ortalama kilometre neden önemli?</h2>
<p>Bir aracın kilometresi yaşına göre yorumlanır. Yaşına göre ortalamanın altında kilometreye sahip bir araç genellikle daha değerli kabul edilir; ortalamanın çok üstündeki kilometre ise motor, şanzıman ve yürüyen aksamda daha fazla yıpranma beklentisi doğurur.</p>
<h2>Yüksek kilometreli araç değersiz midir?</h2>
<p>Hayır. Düzenli bakımı yapılmış, uzun yolda kullanılmış bir araç, kısa mesafede zorlanmış daha düşük kilometreli bir araçtan daha iyi durumda olabilir. Bu yüzden servis kayıtları ve ekspertiz sonucu, kilometre kadar belirleyicidir. Çok yüksek kilometreli araçlarda fiyatı uzmanımız ekspertizden sonra netleştirir.</p>
<h2>Kilometre düşürme neden kısa yoldan ortaya çıkar?</h2>
<p>Muayene, servis ve sigorta kayıtları aracın geçmiş kilometrelerini iz olarak bırakır. Ekspertizde bu kayıtlar ile göstergedeki değer karşılaştırıldığında tutarsızlık hemen fark edilir. Kilometre düşürmek hem yasal sorumluluk doğurur hem de satışın iptaline kadar varan sonuçlara yol açabilir. Doğru kilometreyle yapılan satış her iki taraf için de en güvenli yoldur.</p>
<h2>Değerlemede kilometreyi nasıl girmelisin?</h2>
<p>Göstergedeki güncel kilometreyi olduğu gibi gir. Fiyatlama sistemimiz kilometreyi aracın yaşı ve piyasadaki benzerleriyle karşılaştırarak ön teklife yansıtır.</p>`,
    sss: [
      ['Yüksek kilometreli aracımı da alıyor musunuz?', 'Evet, her marka ve modeli değerlendiriyoruz. Çok yüksek kilometreli araçlarda kesin fiyatı ekspertizden sonra belirleriz.'],
      ['Kilometre fiyatı ne kadar etkiler?', 'Etki, aracın yaşına ve segmentine göre değişir. Değerleme ekranında kilometreyi girdiğinde bu fark ön teklife otomatik olarak yansır.'],
    ],
  },
];
