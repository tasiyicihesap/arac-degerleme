# OTOKABUL Araç Alım Sitesi + Fiyat Robotu (Cloudflare)

Müşterinin aracını değerlediği sihirbaz + yönetim paneli (`/yonetim/`).
Cloudflare Workers + D1 üzerinde çalışır; hosting ücreti yoktur.

## Nasıl yayına çıkar
Bu depoya yapılan her değişikliği Cloudflare kendiliğinden kurar ve yayınlar (Workers & Pages → arac-degerleme).
Veritabanı (`otokabul-db`) ilk yayında otomatik oluşturulur; ilk açılışta AraçRadar başlangıç piyasa verisi yüklenir.

## İlk kurulum
1. `https://<site>/yonetim/` adresine girin → panel şifrenizi belirleyin (ilk giren belirler, hemen yapın).
2. Ayarlar: telefon, WhatsApp (90 ile), adres, alım marjı.
3. Araç Kataloğu → TSB kasko listesi (otomatik indir ya da Excel seç).

## Klasörler
- `public/` — site ve panel dosyaları (HTML/CSS/JS, logolar)
- `src/` — sunucu tarafı (eski PHP'nin Cloudflare karşılığı)
  - `index.js` — `/api.php`, `/yonetim/api.php`, `/yuklemeler/*` yönlendirmesi
  - `site.js` — müşteri sitesi API'si
  - `yonetim.js` — panel API'si (oturum, fiyat tablosu, toplu değişim, robot, katalog, görseller, yedek)
  - `fiyat.js` — teklif hesaplama motoru
  - `db.js` — veritabanı şeması, ayarlar, robot yazımı, kasko kalibrasyonu
  - `baslangic.json` — ilk açılışta yüklenen AraçRadar piyasa verisi

## PHP sürümünden farklar
- Veritabanı SQLite dosyası yerine Cloudflare D1. Yedek: Ayarlar → "Veritabanı yedeğini indir" (JSON;
  TSB kataloğu yedeğe girmez, TSB'den yeniden alınır). D1 ayrıca son 7 günü otomatik saklar.
- Yüklenen logo/model fotoğrafları veritabanında tutulur.
- Fiyat Tablosu'ndaki "fiyat aralığı" süzgeci artık çalışıyor (PHP sürümünde hiç sonuç döndürmüyordu).
