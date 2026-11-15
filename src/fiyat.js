// OTOKABUL — teklif hesaplama motoru
import { ayarlar, versiyonOrani, yuvar, int, flt, str, nf, buYil, dolu } from './db.js';

export const PARCALAR = {
  on_tampon: 'Ön Tampon', kaput: 'Motor Kaputu', tavan: 'Tavan', bagaj: 'Bagaj Kapağı', arka_tampon: 'Arka Tampon',
  sol_on_camurluk: 'Sol Ön Çamurluk', sol_on_kapi: 'Sol Ön Kapı', sol_arka_kapi: 'Sol Arka Kapı', sol_arka_camurluk: 'Sol Arka Çamurluk',
  sag_on_camurluk: 'Sağ Ön Çamurluk', sag_on_kapi: 'Sağ Ön Kapı', sag_arka_kapi: 'Sağ Arka Kapı', sag_arka_camurluk: 'Sağ Arka Çamurluk',
};
export const KRITIK_PARCA = ['tavan', 'kaput'];
export const DURUMLAR = { orijinal: 'Orijinal', lokal: 'Lokal Boyalı', boyali: 'Boyalı', degisen: 'Değişen' };

// Satırın kullanılan baz fiyatı: elle girilmişse o, yoksa piyasa x (1 + ayar%)
export function bazFiyat(r) {
  if (r.elle) return int(r.elle);
  return yuvar(flt(r.piyasa) * (1 + flt(r.ayar) / 100));
}

async function satirBul(D, marka, model, yil) {
  return D.prepare('SELECT * FROM fiyatlar WHERE marka = ? AND model = ? AND aktif = 1 ORDER BY ABS(yil - ?) ASC, yil DESC LIMIT 1').bind(marka, model, yil).first();
}

const yuvarla = (x, adim) => (adim > 0 ? yuvar(x / adim) * adim : yuvar(x));

export async function teklifHesapla(D, g, A) {
  A = A || (await ayarlar(D));
  const marka = str(g.marka), model = str(g.model), yil = int(g.yil);
  const km = Math.max(0, int(g.km));
  const sonuc = { durum: 'yok', baz: 0, min: 0, max: 0, kalemler: [], mesaj: '' };

  const r = await satirBul(D, marka, model, yil);
  if (!r) { sonuc.mesaj = 'Bu model için fiyat verisi yok — uzmanımız değerlendirip sizi arayacak.'; return sonuc; }

  let baz = bazFiyat(r);
  const kalem = [];
  if (int(r.yil) !== yil) {
    const fark = int(r.yil) - yil;
    if (Math.abs(fark) > 3) { sonuc.mesaj = 'Bu model yılı için yeterli piyasa verisi yok — uzmanımız sizi arayacak.'; return sonuc; }
    const o = Math.pow(1 - flt(A.yil_kaybi) / 100, fark) - 1;
    baz = baz * (1 + o);
    kalem.push([r.yil + ' model verisinden yıl farkı tahmini', yuvar(o * 100, 1)]);
  }
  const kid = int(g.katalog_id);
  if (kid > 0) {
    const vo = (await versiyonOrani(D, kid, yil)) || (await versiyonOrani(D, kid, int(r.yil)));
    if (vo) {
      const lim = flt(A.versiyon_sinir) / 100;
      const o = Math.max(1 - lim, Math.min(1 + lim, vo.oran)) - 1;
      if (Math.abs(o) >= 0.005) { baz = baz * (1 + o); kalem.push(['Motor / paket: ' + vo.versiyon, yuvar(o * 100, 1)]); }
    }
  }
  if (r.kaynak === 'kasko') kalem.push(['Fiyat kaynağı: kasko değeri × piyasa katsayısı (ilan verisi yok)', null]);
  const piyasa = baz;
  let carpan = 1.0;

  for (const [alan, etiket] of [['yakit', 'Yakıt'], ['vites', 'Vites']]) {
    const v = str(g[alan]);
    const o = flt(A[alan + '_' + v] ?? 0);
    if (o !== 0) { carpan *= 1 + o / 100; kalem.push([etiket + ': ' + v, o]); }
  }

  let beklenen = int(r.km_ort) > 0 ? int(r.km_ort) : Math.trunc(Math.max(5000, (buYil() - yil + 0.5) * int(A.yillik_km)));
  if (int(r.yil) !== yil) beklenen = Math.trunc(Math.max(5000, (buYil() - yil + 0.5) * int(A.yillik_km)));
  if (km > 0) {
    const f = (km - beklenen) / 10000;
    let o = f > 0 ? -f * flt(A.km_ceza) : -f * flt(A.km_bonus);
    const lim = flt(A.km_sinir);
    o = Math.max(-lim, Math.min(lim, o));
    if (Math.abs(o) >= 0.1) { carpan *= 1 + o / 100; kalem.push(['Kilometre (' + nf(km) + ' km, piyasa ort. ' + nf(beklenen) + ')', yuvar(o, 1)]); }
  }

  const hasar = g.hasar && typeof g.hasar === 'object' && !Array.isArray(g.hasar) ? g.hasar : {};
  const say = { lokal: 0, boyali: 0, degisen: 0 }; let hasarO = 0;
  for (const [p, d] of Object.entries(hasar)) {
    if (!PARCALAR[p] || !(d in say)) continue;
    say[d]++;
    const k = KRITIK_PARCA.includes(p) ? flt(A.tavan_kat) : 1.0;
    hasarO += flt(A[d === 'lokal' ? 'lokal_boya' : d]) * k;
  }
  if (hasarO > 0) {
    const t = [];
    if (say.lokal) t.push(say.lokal + ' lokal boya');
    if (say.boyali) t.push(say.boyali + ' boyalı');
    if (say.degisen) t.push(say.degisen + ' değişen');
    carpan *= 1 - hasarO / 100; kalem.push(['Boya / değişen (' + t.join(', ') + ')', -yuvar(hasarO, 1)]);
  }

  const tramer = Math.max(0, int(g.tramer));
  if (tramer > 0 && piyasa > 0) {
    const o = Math.min(flt(A.tramer_sinir), tramer / piyasa * 100 * flt(A.tramer_kat));
    carpan *= 1 - o / 100; kalem.push(['Tramer kaydı (' + nf(tramer) + ' TL)', -yuvar(o, 1)]);
  }

  carpan *= 1 - flt(A.alim_marji) / 100;

  const orta = piyasa * carpan;
  const ar = flt(A.aralik) / 100, adim = int(A.yuvarla);
  sonuc.baz = yuvar(piyasa);
  sonuc.min = yuvarla(orta * (1 - ar), adim);
  sonuc.max = yuvarla(orta * (1 + ar), adim);
  sonuc.kalemler = kalem;
  sonuc.satir_id = int(r.id);
  sonuc.durum = 'ok';

  if (dolu(g.agir)) { sonuc.durum = 'ekspertiz'; sonuc.mesaj = 'Ağır hasar kaydı olan araçlarda fiyatı ekspertiz sonrası veriyoruz — sizi arayacağız.'; }
  else if (yil < int(A.min_yil)) { sonuc.durum = 'ekspertiz'; sonuc.mesaj = A.min_yil + ' öncesi araçlar için fiyatı uzmanımız belirliyor — sizi arayacağız.'; }
  else if (km > int(A.max_km)) { sonuc.durum = 'ekspertiz'; sonuc.mesaj = 'Yüksek kilometreli araçlar için fiyatı uzmanımız belirliyor — sizi arayacağız.'; }
  else if (say.degisen >= 4) { sonuc.durum = 'ekspertiz'; sonuc.mesaj = 'Çok parçası değişen araçlarda fiyatı ekspertiz sonrası veriyoruz — sizi arayacağız.'; }
  return sonuc;
}
