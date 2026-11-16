// OTOKABUL — kasa tipi belirleme
// Katalogdaki (TSB) kasa bilgisi eksik ya da hatalı olabiliyor (ör. Opel Astra'nın "Diğer", Skoda Combi'nin "Ticari" görünmesi).
// Önce versiyon adındaki açık kasa ifadesine, yoksa modelin bilinen varsayılan kasasına bakılır.

const VARSAYILAN = {
  // Renault
  'Renault|Megane': 'Hatchback', 'Renault|Clio': 'Hatchback', 'Renault|Fluence': 'Sedan', 'Renault|Symbol': 'Sedan', 'Renault|R 9': 'Sedan',
  'Renault|R 19': 'Hatchback', 'Renault|Taliant': 'Sedan', 'Renault|R 12': 'Sedan', 'Renault|Kadjar': 'SUV', 'Renault|Laguna': 'Hatchback',
  'Renault|Talisman': 'Sedan', 'Renault|Scenic': 'MPV / Ticari', 'Renault|Grand Scenic': 'MPV / Ticari', 'Renault|Captur': 'SUV', 'Renault|Latitude': 'Sedan',
  'Renault|Koleos': 'SUV', 'Renault|Megane E-Tech': 'SUV', 'Renault|R 11': 'Hatchback', 'Renault|Twingo': 'Hatchback', 'Renault|Austral': 'SUV',
  'Renault|Kangoo': 'MPV / Ticari', 'Renault|Trafic': 'MPV / Ticari', 'Renault|Master': 'MPV / Ticari', 'Renault|Zoe': 'Hatchback', 'Renault|Arkana': 'SUV',
  // Volkswagen
  'Volkswagen|Passat': 'Sedan', 'Volkswagen|Polo': 'Hatchback', 'Volkswagen|Golf': 'Hatchback', 'Volkswagen|Jetta': 'Sedan', 'Volkswagen|VW CC': 'Sedan',
  'Volkswagen|Bora': 'Sedan', 'Volkswagen|Amarok': 'Pick-up', 'Volkswagen|Tiguan': 'SUV', 'Volkswagen|Passat Variant': 'Station Wagon',
  'Volkswagen|Scirocco': 'Coupe', 'Volkswagen|Touareg': 'SUV', 'Volkswagen|Beetle': 'Hatchback', 'Volkswagen|Arteon': 'Sedan', 'Volkswagen|T-Roc': 'SUV',
  'Volkswagen|T-Cross': 'SUV', 'Volkswagen|Taigo': 'SUV', 'Volkswagen|Caddy': 'MPV / Ticari', 'Volkswagen|Transporter': 'MPV / Ticari', 'Volkswagen|Touran': 'MPV / Ticari',
  'Volkswagen|Up': 'Hatchback', 'Volkswagen|ID.4': 'SUV', 'Volkswagen|ID.3': 'Hatchback', 'Volkswagen|Vento': 'Sedan',
  // Fiat / Tofaş
  'Fiat|Egea': 'Sedan', 'Fiat|Egea Cross': 'SUV', 'Fiat|Linea': 'Sedan', 'Fiat|Punto': 'Hatchback', 'Fiat|Palio': 'Hatchback', 'Fiat|Albea': 'Sedan',
  'Fiat|Tempra': 'Sedan', 'Fiat|Uno': 'Hatchback', 'Fiat|Tipo': 'Sedan', 'Fiat|500 Ailesi': 'Hatchback', 'Fiat|Marea': 'Sedan', 'Fiat|Siena': 'Sedan',
  'Fiat|Brava': 'Hatchback', 'Fiat|Bravo': 'Hatchback', 'Fiat|Freemont': 'SUV', 'Fiat|Panda': 'Hatchback', 'Fiat|500 X': 'SUV', 'Fiat|Stilo': 'Hatchback',
  'Fiat|Doblo': 'MPV / Ticari', 'Fiat|Fiorino': 'MPV / Ticari', 'Fiat|Scudo': 'MPV / Ticari', 'Fiat|Ducato': 'MPV / Ticari', 'Fiat|Idea': 'MPV / Ticari', 'Fiat|Fullback': 'Pick-up',
  'Tofaş|Şahin': 'Sedan', 'Tofaş|Doğan': 'Sedan', 'Tofaş|Kartal': 'Station Wagon', 'Tofaş|Murat': 'Sedan', 'Tofaş|Serçe': 'Sedan',
  // Toyota
  'Toyota|Corolla': 'Sedan', 'Toyota|Auris': 'Hatchback', 'Toyota|Yaris': 'Hatchback', 'Toyota|Avensis': 'Sedan', 'Toyota|Hilux': 'Pick-up',
  'Toyota|Verso': 'MPV / Ticari', 'Toyota|RAV4': 'SUV', 'Toyota|C-HR': 'SUV', 'Toyota|Corolla Cross': 'SUV', 'Toyota|Land Cruiser': 'SUV', 'Toyota|Camry': 'Sedan', 'Toyota|Proace City': 'MPV / Ticari',
  // Ford
  'Ford|Focus': 'Hatchback', 'Ford|Fiesta': 'Hatchback', 'Ford|Kuga': 'SUV', 'Ford|Mondeo': 'Sedan', 'Ford|Ranger': 'Pick-up', 'Ford|C-Max': 'MPV / Ticari',
  'Ford|Escort': 'Hatchback', 'Ford|Fusion': 'Hatchback', 'Ford|B-Max': 'MPV / Ticari', 'Ford|Taunus': 'Sedan', 'Ford|Puma': 'SUV', 'Ford|EcoSport': 'SUV',
  'Ford|S-Max': 'MPV / Ticari', 'Ford|Galaxy': 'MPV / Ticari', 'Ford|Ka': 'Hatchback', 'Ford|Mustang': 'Coupe',
  // Honda
  'Honda|Civic': 'Sedan', 'Honda|CR-V': 'SUV', 'Honda|City': 'Sedan', 'Honda|Jazz': 'Hatchback', 'Honda|Accord': 'Sedan', 'Honda|HR-V': 'SUV', 'Honda|ZR-V': 'SUV',
  // Opel
  'Opel|Astra': 'Hatchback', 'Opel|Corsa': 'Hatchback', 'Opel|Insignia': 'Sedan', 'Opel|Vectra': 'Sedan', 'Opel|Mokka': 'SUV', 'Opel|Mokka X': 'SUV',
  'Opel|Grandland X': 'SUV', 'Opel|Grandland': 'SUV', 'Opel|Crossland': 'SUV', 'Opel|Crossland X': 'SUV', 'Opel|Meriva': 'MPV / Ticari', 'Opel|Antara': 'SUV',
  'Opel|Zafira': 'MPV / Ticari', 'Opel|Combo': 'MPV / Ticari', 'Opel|Adam': 'Hatchback', 'Opel|Cascada': 'Cabrio', 'Opel|Tigra': 'Coupe',
  // Mercedes-Benz
  'Mercedes-Benz|C Serisi': 'Sedan', 'Mercedes-Benz|E Serisi': 'Sedan', 'Mercedes-Benz|CLA': 'Sedan', 'Mercedes-Benz|A Serisi': 'Hatchback',
  'Mercedes-Benz|S Serisi': 'Sedan', 'Mercedes-Benz|B Serisi': 'Hatchback', 'Mercedes-Benz|CLS': 'Sedan', 'Mercedes-Benz|200': 'Sedan', 'Mercedes-Benz|190': 'Sedan',
  'Mercedes-Benz|300': 'Sedan', 'Mercedes-Benz|GLA': 'SUV', 'Mercedes-Benz|GLB': 'SUV', 'Mercedes-Benz|GLC': 'SUV', 'Mercedes-Benz|GLE': 'SUV', 'Mercedes-Benz|GLS': 'SUV',
  'Mercedes-Benz|GLK': 'SUV', 'Mercedes-Benz|ML': 'SUV', 'Mercedes-Benz|G Serisi': 'SUV', 'Mercedes-Benz|X': 'Pick-up', 'Mercedes-Benz|CLK': 'Coupe',
  'Mercedes-Benz|SLK': 'Cabrio', 'Mercedes-Benz|Vito': 'MPV / Ticari', 'Mercedes-Benz|V Serisi': 'MPV / Ticari', 'Mercedes-Benz|Sprinter': 'MPV / Ticari', 'Mercedes-Benz|Citan': 'MPV / Ticari',
  // BMW
  'BMW|3 Serisi': 'Sedan', 'BMW|5 Serisi': 'Sedan', 'BMW|7 Serisi': 'Sedan', 'BMW|1 Serisi': 'Hatchback', 'BMW|2 Serisi': 'Coupe', 'BMW|4 Serisi': 'Coupe',
  'BMW|6 Serisi': 'Coupe', 'BMW|8 Serisi': 'Coupe', 'BMW|i Serisi': 'Hatchback', 'BMW|X1': 'SUV', 'BMW|X2': 'SUV', 'BMW|X3': 'SUV', 'BMW|X4': 'SUV', 'BMW|X5': 'SUV',
  'BMW|X6': 'SUV', 'BMW|X7': 'SUV', 'BMW|Z Serisi': 'Cabrio', 'BMW|iX': 'SUV', 'BMW|iX1': 'SUV',
  // Hyundai
  'Hyundai|I20': 'Hatchback', 'Hyundai|i20 Troy': 'Hatchback', 'Hyundai|i20 Active': 'SUV', 'Hyundai|Accent Blue': 'Sedan', 'Hyundai|Accent Era': 'Sedan',
  'Hyundai|Accent': 'Sedan', 'Hyundai|Tucson': 'SUV', 'Hyundai|Getz': 'Hatchback', 'Hyundai|I30': 'Hatchback', 'Hyundai|Elantra': 'Sedan', 'Hyundai|Ix35': 'SUV',
  'Hyundai|I10': 'Hatchback', 'Hyundai|Santa Fe': 'SUV', 'Hyundai|Kona': 'SUV', 'Hyundai|Bayon': 'SUV', 'Hyundai|Excel': 'Sedan', 'Hyundai|Matrix': 'MPV / Ticari',
  'Hyundai|Ioniq 6': 'Sedan', 'Hyundai|Ioniq 5': 'SUV', 'Hyundai|H-1': 'MPV / Ticari', 'Hyundai|Starex': 'MPV / Ticari',
  // Audi
  'Audi|A3': 'Hatchback', 'Audi|A4': 'Sedan', 'Audi|A6': 'Sedan', 'Audi|A8': 'Sedan', 'Audi|A5': 'Coupe', 'Audi|A7': 'Hatchback', 'Audi|A1': 'Hatchback',
  'Audi|Q2': 'SUV', 'Audi|Q3': 'SUV', 'Audi|Q5': 'SUV', 'Audi|Q7': 'SUV', 'Audi|Q8': 'SUV', 'Audi|TT': 'Coupe',
  // Seat / Cupra / Skoda
  'Seat|Leon': 'Hatchback', 'Seat|Ibiza': 'Hatchback', 'Seat|Toledo': 'Sedan', 'Seat|Cordoba': 'Sedan', 'Seat|Ateca': 'SUV', 'Seat|Arona': 'SUV', 'Seat|Altea': 'MPV / Ticari',
  'Cupra|Leon': 'Hatchback', 'Cupra|Formentor': 'SUV', 'Cupra|Born': 'Hatchback',
  'Skoda|Superb': 'Sedan', 'Skoda|Octavia': 'Sedan', 'Skoda|Rapid': 'Sedan', 'Skoda|Fabia': 'Hatchback', 'Skoda|Scala': 'Hatchback', 'Skoda|Felicia': 'Hatchback',
  'Skoda|Favorit': 'Hatchback', 'Skoda|Karoq': 'SUV', 'Skoda|Kodiaq': 'SUV', 'Skoda|Kamiq': 'SUV', 'Skoda|Yeti': 'SUV', 'Skoda|Roomster': 'MPV / Ticari', 'Skoda|Enyaq': 'SUV',
  // Nissan
  'Nissan|Qashqai': 'SUV', 'Nissan|Micra': 'Hatchback', 'Nissan|X-Trail': 'SUV', 'Nissan|Navara': 'Pick-up', 'Nissan|Juke': 'SUV', 'Nissan|Primera': 'Sedan',
  'Nissan|Note': 'Hatchback', 'Nissan|Almera': 'Sedan', 'Nissan|Pulsar': 'Hatchback',
  // Peugeot / Citroen / DS
  'Peugeot|301': 'Sedan', 'Peugeot|308': 'Hatchback', 'Peugeot|508': 'Sedan', 'Peugeot|407': 'Sedan', 'Peugeot|408': 'Sedan', 'Peugeot|206': 'Hatchback',
  'Peugeot|207': 'Hatchback', 'Peugeot|208': 'Hatchback', 'Peugeot|307': 'Hatchback', 'Peugeot|106': 'Hatchback', 'Peugeot|107': 'Hatchback', 'Peugeot|306': 'Hatchback',
  'Peugeot|2008': 'SUV', 'Peugeot|3008': 'SUV', 'Peugeot|5008': 'SUV', 'Peugeot|RCZ': 'Coupe', 'Peugeot|Partner': 'MPV / Ticari', 'Peugeot|Rifter': 'MPV / Ticari',
  'Citroen|C-Elysée': 'Sedan', 'Citroen|C3': 'Hatchback', 'Citroen|C4': 'Hatchback', 'Citroen|C4 X': 'Sedan', 'Citroen|e-C4 X': 'Sedan', 'Citroen|C5': 'Sedan',
  'Citroen|C5 AirCross': 'SUV', 'Citroen|C3 AirCross': 'SUV', 'Citroen|C4 Cactus': 'SUV', 'Citroen|C4 Picasso': 'MPV / Ticari', 'Citroen|C4 Grand Picasso': 'MPV / Ticari',
  'Citroen|Xsara': 'Hatchback', 'Citroen|AMI': 'Hatchback', 'Citroen|Berlingo': 'MPV / Ticari', 'Citroen|Nemo': 'MPV / Ticari', 'DS Automobiles|DS4': 'Hatchback',
  // Dacia / Chevrolet / Kia
  'Dacia|Sandero': 'Hatchback', 'Dacia|Logan': 'Sedan', 'Dacia|Duster': 'SUV', 'Dacia|Lodgy': 'MPV / Ticari', 'Dacia|Jogger': 'MPV / Ticari', 'Dacia|Dokker': 'MPV / Ticari',
  'Chevrolet|Captiva': 'SUV', 'Chevrolet|Cruze': 'Sedan', 'Chevrolet|Aveo': 'Sedan', 'Chevrolet|Lacetti': 'Sedan', 'Chevrolet|Kalos': 'Hatchback', 'Chevrolet|Spark': 'Hatchback',
  'Kia|Sportage': 'SUV', 'Kia|Sorento': 'SUV', 'Kia|Stonic': 'SUV', 'Kia|XCeed': 'SUV', 'Kia|Rio': 'Hatchback', 'Kia|Ceed': 'Hatchback', 'Kia|Cerato': 'Sedan', 'Kia|Picanto': 'Hatchback',
  // Volvo / Land Rover / MINI / Mazda / Mitsubishi
  'Volvo|S40': 'Sedan', 'Volvo|S60': 'Sedan', 'Volvo|S80': 'Sedan', 'Volvo|S90': 'Sedan', 'Volvo|V40': 'Hatchback', 'Volvo|V40 Cross Country': 'Hatchback',
  'Volvo|XC40': 'SUV', 'Volvo|XC60': 'SUV', 'Volvo|XC90': 'SUV', 'Volvo|EX30': 'SUV',
  'Land Rover|Range Rover': 'SUV', 'Land Rover|Range Rover Sport': 'SUV', 'Land Rover|Range Rover Evoque': 'SUV', 'Land Rover|Range Rover Velar': 'SUV',
  'Land Rover|Freelander': 'SUV', 'Land Rover|Discovery': 'SUV', 'Land Rover|Discovery Sport': 'SUV', 'Land Rover|Defender': 'SUV',
  'MINI|Cooper': 'Hatchback', 'MINI|Countryman': 'SUV', 'Mazda|3': 'Sedan', 'Mazda|323': 'Sedan', 'Mazda|626': 'Sedan', 'Mazda|6': 'Sedan', 'Mazda|CX-3': 'SUV', 'Mazda|CX-5': 'SUV',
  'Mitsubishi|L 200': 'Pick-up', 'Mitsubishi|Lancer': 'Sedan', 'Mitsubishi|Colt': 'Hatchback', 'Mitsubishi|Carisma': 'Sedan', 'Mitsubishi|ASX': 'SUV', 'Mitsubishi|Outlander': 'SUV',
  // Diğerleri
  'Jeep|Renegade': 'SUV', 'Jeep|Compass': 'SUV', 'Jeep|Cherokee': 'SUV', 'Jeep|Grand Cherokee': 'SUV', 'Jeep|Wrangler': 'SUV',
  'Porsche|Cayenne': 'SUV', 'Porsche|Macan': 'SUV', 'Porsche|Panamera': 'Sedan', 'Porsche|Taycan Elektrik': 'Sedan', 'Porsche|911': 'Coupe',
  'Tesla|Model Y': 'SUV', 'Tesla|Model 3': 'Sedan', 'Suzuki|Swift': 'Hatchback', 'Suzuki|Vitara': 'SUV', 'Suzuki|Grand Vitara': 'SUV', 'Suzuki|SX4 S-Cross': 'SUV',
  'Subaru|Forester': 'SUV', 'Subaru|XV': 'SUV', 'KGM|Kyron': 'SUV', 'KGM|Rexton': 'SUV', 'KGM|Torres': 'SUV', 'KGM|Korando': 'SUV', 'KGM|Actyon Sports': 'Pick-up',
  'KGM|Korando Sports': 'Pick-up', 'KGM|Musso': 'Pick-up', 'Lada|Vega': 'Sedan', 'Lada|Samara': 'Hatchback', 'Lada|Niva': 'SUV', 'Alfa Romeo|Giulietta': 'Hatchback',
  'Alfa Romeo|156': 'Sedan', 'Alfa Romeo|159': 'Sedan', 'Alfa Romeo|Giulia': 'Sedan', 'Alfa Romeo|Stelvio': 'SUV', 'Togg|T10F': 'Sedan', 'Togg|T10X': 'SUV',
  'Isuzu|D-Max': 'Pick-up', 'Chrysler|300 C': 'Sedan', 'Dodge|Nitro': 'SUV', 'Jaguar|XF': 'Sedan', 'Jaguar|XE': 'Sedan', 'Jaguar|F-Pace': 'SUV',
  'Chery|Tiggo 7 Pro': 'SUV', 'Chery|Tiggo 8 Pro': 'SUV', 'BYD|Atto 3': 'SUV', 'BYD|Seal': 'Sedan', 'MG|ZS': 'SUV', 'MG|HS': 'SUV',
};

const R = {
  pickup: /\b(PICK ?UP|DOUBLE ?CAB|CIFT KABIN|TEK KABIN|D ?CAB|CREW ?CAB|KING ?CAB|4X4 DC)\b/,
  ticari: /\b(PANELVAN|PANEL VAN|VAN|CARGO|FURGON|KAMYONET|MINIBUS|SASI|CHASSIS)\b/,
  cabrio: /\b(CABRIO|CABRIOLET|CONVERTIBLE|ROADSTER|SPIDER|SPYDER|VOLANTE)\b/,
  coupe: /\b(COUPE|CPE|KUPE)\b/,
  sw: /\b(SW|STATION|WAGON|TOURER|SPORTSTOURER|SPORTS ?TOURER|AVANT|ESTATE|VARIANT|BREAK|SPORT ?BRAKE|SHOOTING ?BRAKE|TOURING|GRAND ?TOUR|GRANDTOUR|KOMBI|COMBI|WEEKEND|SPORTSWAGON|ALLTRACK|ALLROAD|CROSS WAGON|SCOUT)\b/,
  sedan: /\b(SEDAN|NB|NOTCHBACK|LIMOUSINE|SALOON|EUROPA)\b/,
  hb: /\b(HB|HATCHBACK|HATCH|GTC|SPORTBACK|LIFTBACK|3K|5K)\b/,
};

const duz = (s) => ' ' + String(s || '').toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ç/g, 'C').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ğ/g, 'G')
  .replace(/[^A-Z0-9]+/g, ' ') + ' ';

export function modelKasasi(marka, model) { return VARSAYILAN[marka + '|' + model] || ''; }

// marka/model + versiyon adı (+ katalogdaki eski kasa) → kasa
export function kasaBul(marka, model, metin, eski) {
  const v = duz(metin), def = modelKasasi(marka, model);
  if (R.pickup.test(v)) return 'Pick-up';
  if (R.ticari.test(v)) return 'MPV / Ticari';
  const binek = !def || !['MPV / Ticari', 'Pick-up', 'SUV'].includes(def);
  if (binek) {
    if (R.cabrio.test(v)) return 'Cabrio';
    if (R.coupe.test(v) && !/GRAN COUPE|GRANCOUPE|4 KAPI/.test(v)) return 'Coupe';
    if (R.sw.test(v)) return 'Station Wagon';
    // "ST": Opel/Seat'te istasyon; Ford ve Hyundai'de performans paketi
    if (/\bST\b/.test(v) && marka !== 'Ford' && marka !== 'Hyundai') return 'Station Wagon';
    if (R.sedan.test(v) || (marka === 'Opel' && /\bCLASSIC\b/.test(v))) return 'Sedan';
    if (R.hb.test(v)) return 'Hatchback';
  }
  if (def) return def;
  return eski || 'Diğer';
}
