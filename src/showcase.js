/**
 * The gallery: one entry per unique photograph the owner supplied.
 *
 * There are no prices here and none on the site. The catalogue is replaced
 * wholesale when GALLERY_VERSION changes in src/db.js, so a new upload set can
 * be published without touching the database by hand.
 *
 * Photographs are the shop's own files in incoming/. Product copy describes
 * only what the photograph shows and general furniture construction; the
 * sourced trade notes live on each product page.
 */
import { UPLOADS } from './upload-pieces.js';

const MATERIAL_LABEL = {
  leather: 'leather',
  linen: 'woven linen',
  cotton: 'woven cotton',
  velvet: 'velvet',
  boucle: 'bouclé',
  oak: 'oak',
  walnut: 'walnut',
  'solid-wood': 'solid wood',
  mesh: 'mesh',
  metal: 'metal',
  glass: 'glass',
  stone: 'stone',
  foam: 'foam',
};

const MATERIAL_AM = {
  leather: 'ቆዳ',
  linen: 'ተልባ',
  cotton: 'ጥጥ',
  velvet: 'ቬልቬት',
  boucle: 'ቡክሌ',
  oak: 'ኦክ',
  walnut: 'ዋልነት',
  'solid-wood': 'እንጨት',
  mesh: 'ሜሽ',
  metal: 'ብረት',
  glass: 'መስታወት',
  stone: 'ድንጋይ',
  foam: 'ስፖንጅ',
};

const CATEGORY_AM = {
  sofas: 'ሶፋ',
  chairs: 'ወንበር',
  dining: 'የመመገቢያ ስብስብ',
  bedroom: 'አልጋ',
  tables: 'ጠረጴዛ',
  storage: 'ማከማቻ',
  office: 'የቢሮ ዕቃ',
};

const ROOM_LABEL = {
  living: 'living room',
  bedroom: 'bedroom',
  dining: 'dining room',
  office: 'office',
};

const ROOM_AM = {
  living: 'ሳሎን',
  bedroom: 'መኝታ ቤት',
  dining: 'የመመገቢያ ክፍል',
  office: 'ቢሮ',
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70);

const featuredNames = new Set([
  'Grey Curved Bouclé Sectional',
  'Cream Curved Sectional',
  'Brown Leather Chesterfield Sofa',
  'Brown Curved Bouclé Sofa',
  'Cream Cloud Bed',
  'Cream Showroom Sofa Set',
  'Cream Curved Sofa Set',
  'Black and Gold TV Console',
]);

function careFor(materials) {
  if (materials.includes('leather')) return 'Dust weekly with a dry cloth and condition the leather twice a year. Keep it out of direct sun and away from radiators.';
  if (materials.includes('boucle')) return 'Vacuum gently with a brush attachment. Trim a pulled loop with scissors instead of pulling it, and blot spills with a clean cloth.';
  if (materials.includes('velvet')) return 'Brush the pile in one direction and vacuum with a soft attachment. Blot spills at once and keep the piece out of direct sun.';
  if (materials.includes('linen') || materials.includes('cotton')) return 'Vacuum weekly with a soft brush. Rotate the cushions monthly and blot spills with a clean cloth; covers can be dry-cleaned.';
  if (materials.includes('stone')) return 'Wipe with a damp cloth and dry immediately. Use coasters under glasses and re-seal the stone as the fabricator advises.';
  if (materials.includes('mesh')) return 'Vacuum the mesh with a soft brush and wipe the frame with a damp cloth. Check the castors and arm bolts twice a year.';
  return 'Dust with a dry cloth. Wipe marks with a slightly damp cloth and dry immediately; keep the piece out of direct sun and away from heat.';
}

function careAm(materials) {
  if (materials.includes('leather')) return 'በሳምንት አንድ ጊዜ በደረቅ ጨርቅ ያጽዱ፤ ቆዳውን በዓመት ሁለት ጊዜ ያንከባክቡ። ከፀሐይና ከማሞቂያ ያርቁ።';
  if (materials.includes('boucle')) return 'በለስላሳ ብሩሽ ያጽዱ። የተሳበውን ቀለበት አትጎትቱ፤ በቁርጥ ይቁረጡት። የፈሰሰውን ወዲያውኑ በንጹህ ጨርቅ ይደርቁ።';
  if (materials.includes('velvet')) return 'በአንድ አቅጣጫ ያብሩ፤ በለስላሳ መሣሪያ ያጽዱ። የፈሰሰውን ወዲያውኑ ይደርቁ።';
  if (materials.includes('linen') || materials.includes('cotton')) return 'በሳምንት አንድ ጊዜ በለስላሳ ብሩሽ ያጽዱ። ትራሶቹን በየወሩ ያዙሩ፤ የፈሰሰውን በንጹህ ጨርቅ ይደርቁ።';
  return 'በደረቅ ጨርቅ ያጽዱ። ምልክቶችን በትንሽ እርጥብ ጨርቅ አጽድተው ወዲያውኑ ያድርቁ፤ ከፀሐይና ከሙቀት ያርቁ።';
}

function englishDescription(piece, material, category) {
  const room = ROOM_LABEL[piece.room];
  if (category === 'office') {
    if (/chair|bench|seating/i.test(piece.name)) {
      return `${piece.name} is office seating shown in ${material}, with a foam-filled seat, a shaped back and a metal base. Sit on it at the height you actually work at; the showroom can explain the castors and the gas lift before you decide.`;
    }
    return `${piece.name} is an office desk shown in ${material}, with a braced frame, a cable cut-out and a modesty panel. Drawers run on their own runners and the desk is assembled before collection; ask the showroom to set the cable cut-out on the side you need.`;
  }
  if (piece.category === 'sofas') {
    return `${piece.name} is a ${room} sofa shown in ${material}. It is built on a wooden frame with foam-filled seat and back cushions and spring suspension under the seat. Seat depth and firmness are best judged in person — call the shop and we will tell you which showroom has it on the floor.`;
  }
  if (piece.category === 'chairs') {
    if (piece.room === 'office') {
      return `${piece.name} is an office chair shown in ${material}, with a foam-filled seat, a shaped back and a five-star base. The gas lift sets the height and the castors suit hard floors; sit on it at the height you actually work at before you decide.`;
    }
    return `${piece.name} is a ${room} chair shown in ${material}. The seat is foam-filled over a wooden frame, with a shaped back for support and a finish that is easy to keep clean. It is a single chair unless the photograph shows a pair or a set.`;
  }
  if (piece.category === 'dining') {
    return `${piece.name} brings a table and its chairs together as one set. The table top sits on a braced frame, and the chairs have foam-filled seats and shaped backs. The photographs show the exact combination on the floor; call before you travel so we can confirm it is still assembled in the showroom.`;
  }
  if (piece.category === 'bedroom') {
    return `${piece.name} is a bed with a padded or panelled headboard and a slatted base that lets air circulate under the mattress. The frame is built to be assembled at the showroom before collection, and the slats can be checked with the mattress you plan to use.`;
  }
  if (piece.category === 'tables') {
    return `${piece.name} is an office desk shown in ${material}, with a braced frame, a cable cut-out and a modesty panel. Drawers run on their own runners and the desk is assembled before collection; ask the showroom to set the cable cut-out on the side you need.`;
  }
  if (piece.category === 'storage') {
    return `${piece.name} is a storage piece shown in ${material}, with adjustable shelves and an anti-tip wall bracket. Doors and drawers are aligned before collection; check the hanging space and shelf heights against what you need to store.`;
  }
  return `${piece.name} is a ${room} table shown in ${material}. The top sits on a braced frame, with the lower shelf or drawer set where the photograph shows it. Check the height against the sofa or media wall it will sit beside before you decide.`;
}

function amharicDescription(piece, materialAm, category) {
  const cat = CATEGORY_AM[category];
  if (category === 'office') {
    return /chair|bench|seating/i.test(piece.name)
      ? `ይህ የ${materialAm} የቢሮ መቀመጫ በስፖንጅ የተሞላ መቀመጫ፣ የተቀረጸ ጀርባና የብረት መሠረት አለው። በሚሠሩበት ቁመት ተቀምጠው ይመልከቱት።`
      : `ይህ የ${materialAm} የቢሮ ጠረጴዛ በተደገፈ ክፈፍ፣ የኬብል መውጫና የፊት መሸፈኛ የተሠራ ነው። መሳቢያዎቹ በራሳቸው ማሽን ይንቀሳቀሳሉ።`;
  }
  if (piece.category === 'sofas') {
    return `ይህ የ${materialAm} ሶፋ ለሳሎን የሚሆን ነው። በእንጨት ክፈፍ፣ በስፖንጅ በተሞላ መቀመጫና ጀርባ፣ ከመቀመጫው ስር በስፕሪንግ ድጋፍ የተሠራ ነው። በሾውሩም ተቀምጠው ይመልከቱት።`;
  }
  if (piece.category === 'chairs') {
    if (piece.room === 'office') {
      return `ይህ የ${materialAm} የቢሮ ወንበር በስፖንጅ የተሞላ መቀመጫ፣ የተቀረጸ ጀርባና ባለአምስት እግር መሠረት አለው። ቁመቱ በጋዝ ማስተካከያ ይስተካከላል።`;
    }
    return `ይህ የ${materialAm} ${cat} ነው። መቀመጫው በስፖንጅ የተሞላ፣ ክፈፉም የእንጨት ነው፤ ጀርባው ድጋፍ ይሰጣል።`;
  }
  if (piece.category === 'dining') {
    return `ይህ የ${materialAm} የመመገቢያ ስብስብ ጠረጴዛና ወንበሮችን ያካትታል። ጠረጴዛው በተደገፈ ክፈፍ ላይ የተቀመጠ ነው፤ ወንበሮቹም በስፖንጅ የተሞላ መቀመጫ አላቸው።`;
  }
  if (piece.category === 'bedroom') {
    return `ይህ የ${materialAm} አልጋ የተሸፈነ ወይም በእንጨት የተሠራ የጭንቅላት ሰሌዳና አየር እንዲዘዋወር የሚያስችል የእንጨት ስላት መሰረት አለው።`;
  }
  if (piece.category === 'tables') {
    return `ይህ የ${materialAm} የቢሮ ጠረጴዛ በተደገፈ ክፈፍ፣ የኬብል መውጫና የፊት መሸፈኛ የተሠራ ነው። መሳቢያዎቹ በራሳቸው ማሽን ይንቀሳቀሳሉ።`;
  }
  if (piece.category === 'storage') {
    return `ይህ የ${materialAm} ማከማቻ ሊስተካከሉ የሚችሉ መደርደሪያዎችና ከመውደቅ የሚከላከል የግድግዳ ማሰሪያ አለው። በሮቹና መሳቢያዎቹ ከመውሰድዎ በፊት ይስተካከላሉ።`;
  }
  return `ይህ የ${materialAm} ጠረጴዛ ነው። ገጹ በተደገፈ ክፈፍ ላይ የተቀመጠ ነው፤ የታችኛው መደርደሪያ ወይም መሳቢያ በፎቶው እንደሚታየው ነው።`;
}

const usedSlugs = new Set();

export const SHOWCASE = UPLOADS.map((piece, index) => {
  const materials = piece.materials;
  const material = MATERIAL_LABEL[materials[0]] || 'wood';
  const materialAm = MATERIAL_AM[materials[0]] || 'እንጨት';
  let slug = slugify(piece.name);
  if (usedSlugs.has(slug)) slug += '-' + (index + 1);
  usedSlugs.add(slug);
  const featured = featuredNames.has(piece.name) ? 1 : 0;
  const category = piece.room === 'office' ? 'office' : piece.category;
  return {
    slug,
    sku: 'FF-' + String(201 + index),
    name_en: piece.name,
    name_am: `የ${materialAm} ${CATEGORY_AM[category]}`,
    tagline_en: `${material.charAt(0).toUpperCase() + material.slice(1)} · ${piece.features[0]} · ${ROOM_LABEL[piece.room]}`,
    tagline_am: `የ${materialAm} ${CATEGORY_AM[category]} · ${ROOM_AM[piece.room]}`,
    desc_en: englishDescription(piece, material, category),
    desc_am: amharicDescription(piece, materialAm, category),
    category,
    room: piece.room,
    price: 0,
    compare_at: null,
    badge: null,
    stock_status: piece.file.startsWith('photo_2026-11-16') ? 'in_stock' : 'special_order',
    stock_qty: piece.file.startsWith('photo_2026-11-16') ? 1 : 0,
    lead_time_days: 0,
    origin: 'Showroom collection',
    materials,
    colors: [
      {
        id: 'shown',
        name: { en: 'As shown', am: 'እንደሚታየው' },
        hex: piece.tone,
      },
    ],
    sizes: [],
    dims: {},
    weight: 0,
    features: piece.features,
    care_en: careFor(materials),
    care_am: careAm(materials),
    image: `/assets/img/gallery/${slug}-lux4-960.webp`,
    rev: 'lux4',
    source: '/incoming/' + piece.file,
    gallery: [],
    featured,
    created_at: new Date(Date.UTC(2026, 10, 18) - index * 86400000).toISOString(),
  };
});
