/**
 * Builds src/upload-pieces.js from the owner's photographs.
 *
 * The source files are numbered by the review sheet, not by their download
 * names: several of the saved files are named after a different picture. Each
 * number below was checked against the photograph on the contact sheet.
 * Two byte-identical files and three kitchen/bathroom pictures were left out.
 */
import fs from 'node:fs';

const P = (name, category, room, materials, features, tone) => ({ name, category, room, materials, features, tone });

const ITEMS = {
  1: P('Grey Tufted Office Chair', 'chairs', 'office', ['leather', 'foam', 'metal'], ['Channel-tufted back', 'Height-adjustable gas lift', 'Five-star castor base'], '#6b6f73'),
  2: P('Light Blue Accent Armchair', 'chairs', 'living', ['linen', 'foam', 'solid-wood'], ['Rounded back', 'Loose seat cushion', 'Tapered wood legs'], '#8fa7b8'),
  3: P('White Oval Dining Set', 'dining', 'dining', ['solid-wood', 'foam'], ['Oval table top', 'Six upholstered chairs', 'Pedestal-style legs'], '#e6dcc9'),
  4: P('Blue Upholstered Bed', 'bedroom', 'bedroom', ['velvet', 'foam', 'solid-wood'], ['Gold-trimmed headboard', 'Upholstered side rails', 'Slatted base'], '#334d6e'),
  5: P('White Media Wall Unit', 'tables', 'living', ['solid-wood', 'oak', 'metal'], ['Floating console', 'Open display shelves', 'Cable cut-out'], '#e8e1d4'),
  7: P('Carved Wood Bed', 'bedroom', 'bedroom', ['solid-wood'], ['Carved headboard', 'Solid wood side rails', 'Slatted base'], '#6b4a35'),
  8: P('Grey Modular Sofa', 'sofas', 'living', ['cotton', 'foam', 'solid-wood'], ['Deep modular seats', 'Loose back cushions', 'Low profile'], '#8d8a84'),
  9: P('Shoe Storage Cabinet', 'storage', 'bedroom', ['solid-wood', 'metal'], ['Tall shoe shelves', 'Narrow depth', 'Wall anchor supplied'], '#d8d2c6'),
  10: P('Beige Dining Chair', 'chairs', 'dining', ['linen', 'foam', 'solid-wood'], ['Upholstered seat and back', 'Angled wood legs', 'High back'], '#d8c7ae'),
  12: P('Glass Display Cabinet', 'storage', 'dining', ['glass', 'solid-wood', 'metal'], ['Glass doors', 'Adjustable shelves', 'Slim metal frame'], '#c9b299'),
  14: P('Grey Corner Sofa', 'sofas', 'living', ['cotton', 'foam', 'solid-wood'], ['Corner configuration', 'Deep seat', 'Loose cushions'], '#8b8b87'),
  15: P('Round Wood Dining Set', 'dining', 'dining', ['solid-wood', 'foam'], ['Round table', 'Four chairs', 'Central wood base'], '#8a5a3b'),
  16: P('Walnut Writing Desk', 'tables', 'office', ['walnut', 'metal'], ['Walnut top', 'Two drawers', 'Open side shelf'], '#6b4a35'),
  17: P('White Oak Office Desk', 'tables', 'office', ['oak', 'solid-wood'], ['White drawer fronts', 'Oak top', 'Cable cut-out'], '#c9b299'),
  18: P('Oval Cane-Back Dining Set', 'dining', 'dining', ['solid-wood', 'cotton'], ['Oval wood top', 'Six cane-back chairs', 'Trestle base'], '#8a5a3b'),
  19: P('Grey Study Desk', 'tables', 'office', ['solid-wood', 'metal'], ['Grey top', 'Open shelf', 'Black metal legs'], '#77736d'),
  20: P('White Desk with Shelving', 'tables', 'office', ['solid-wood'], ['Upper shelves', 'Closed cupboard', 'Built-in desk surface'], '#e8e1d4'),
  21: P('Green Armchair Pair', 'chairs', 'living', ['velvet', 'foam', 'solid-wood'], ['Rounded arms', 'Deep seat', 'Wood legs'], '#5d6b52'),
  22: P('Oak Wardrobe', 'storage', 'bedroom', ['oak', 'solid-wood', 'metal'], ['Open shelving', 'Hanging rail', 'Long brass handles'], '#b8916a'),
  23: P('Brown Leather Executive Chair', 'chairs', 'office', ['leather', 'foam', 'metal'], ['High back', 'Padded armrests', 'Five-star base'], '#6f4a32'),
  24: P('Executive Desk with Side Return', 'tables', 'office', ['solid-wood', 'metal'], ['Main desk', 'Side return', 'Two white guest chairs'], '#c9b299'),
  25: P('Grey Velvet Corner Sofa', 'sofas', 'living', ['velvet', 'foam', 'solid-wood'], ['L-shaped corner', 'Deep buttoned seat', 'Low arms'], '#7f8288'),
  26: P('Wall Shelf with Clock', 'storage', 'living', ['solid-wood', 'metal'], ['Open shelves', 'Integrated clock', 'Wall-mounted frame'], '#6b4a35'),
  27: P('Grey Upholstered Bed', 'bedroom', 'bedroom', ['linen', 'foam', 'solid-wood'], ['Tall headboard', 'Upholstered frame', 'Slatted base'], '#8c8b87'),
  28: P('Dark Wood Dining Set', 'dining', 'dining', ['solid-wood', 'foam'], ['Dark wood top', 'Six black chairs', 'Trestle base'], '#4d3a2c'),
  29: P('Cream Channel Armchair', 'chairs', 'living', ['boucle', 'foam', 'solid-wood'], ['Channel-tufted back', 'Curved arms', 'Wood legs'], '#e6dcc9'),
  30: P('Blue Velvet Wing Chair', 'chairs', 'living', ['velvet', 'foam', 'solid-wood'], ['Wing back', 'Buttoned detail', 'Wood legs'], '#3c5273'),
  31: P('Wood Bed with LED Lighting', 'bedroom', 'bedroom', ['solid-wood', 'linen'], ['Wood headboard', 'Under-bed LED strip', 'Slatted base'], '#8a5a3b'),
  32: P('Wood Dining Set with Beige Chairs', 'dining', 'dining', ['solid-wood', 'linen'], ['Rectangular top', 'Six upholstered chairs', 'Turned legs'], '#8a5a3b'),
  33: P('Grey and Oak Office Desk', 'tables', 'office', ['oak', 'solid-wood', 'metal'], ['Oak top', 'Grey drawer unit', 'Cable cut-out'], '#8f8578'),
  34: P('White Open Wardrobe', 'storage', 'bedroom', ['solid-wood'], ['Open shelves', 'Hanging rail', 'White finish'], '#eee9df'),
  35: P('Green Wardrobe', 'storage', 'bedroom', ['solid-wood', 'metal'], ['Two doors', 'Interior shelf', 'Metal handles'], '#65735e'),
  36: P('Grey Executive Desk', 'tables', 'office', ['solid-wood', 'metal'], ['Grey top', 'Drawer pedestal', 'Cable cut-out'], '#77736d'),
  37: P('Cream Built-In Shelving', 'storage', 'living', ['solid-wood'], ['Open and closed storage', 'Integrated niche', 'Cream finish'], '#e6dcc9'),
  38: P('Beige Upholstered Bed', 'bedroom', 'bedroom', ['linen', 'foam', 'solid-wood'], ['Tall channel headboard', 'Upholstered frame', 'Slatted base'], '#d8c7ae'),
  39: P('Cream Curved Armchair', 'chairs', 'living', ['boucle', 'foam', 'solid-wood'], ['Curved shell', 'Deep seat', 'Low arms'], '#e6dcc9'),
  40: P('Vintage Brown Leather Sofa', 'sofas', 'living', ['leather', 'foam', 'solid-wood'], ['Buttoned back', 'Rolled arms', 'Nailhead trim'], '#7b4f33'),
  41: P('Black Leather Executive Chair', 'chairs', 'office', ['leather', 'foam', 'metal'], ['High back', 'Padded armrests', 'Five-star base'], '#2f2f31'),
  42: P('Wood Dining Set with Upholstered Chairs', 'dining', 'dining', ['solid-wood', 'linen'], ['Rectangular top', 'Six upholstered chairs', 'Turned legs'], '#8a5a3b'),
  43: P('Upholstered Bed with Wood Trim', 'bedroom', 'bedroom', ['linen', 'foam', 'solid-wood'], ['Upholstered headboard', 'Wood trim', 'Slatted base'], '#b89b78'),
  44: P('Black and White Executive Desk', 'tables', 'office', ['solid-wood', 'metal'], ['Dark top', 'White side return', 'Cable cut-out'], '#3f3f42'),
  45: P('White Frame Office Chair', 'chairs', 'office', ['leather', 'foam', 'metal'], ['White frame', 'Brown leather seat', 'Five-star castor base'], '#c9b299'),
  46: P('Marble Dining Set with Beige Chairs', 'dining', 'dining', ['stone', 'metal', 'foam'], ['Round stone top', 'Four beige chairs', 'Pedestal base'], '#e8e5df'),
  47: P('Round Marble Dining Set', 'dining', 'dining', ['stone', 'metal', 'foam'], ['Round stone top', 'Six cream chairs', 'Pedestal base'], '#e8e5df'),
  48: P('Grey Tall-Headboard Bed', 'bedroom', 'bedroom', ['linen', 'foam', 'solid-wood'], ['Tall headboard', 'Upholstered frame', 'Slatted base'], '#8c8b87'),
  49: P('Beige Fabric Sofa Set', 'sofas', 'living', ['linen', 'foam', 'solid-wood'], ['Three-seat sofa', 'Matching armchair', 'Loose cushions'], '#cfc0a8'),
  50: P('Cream Upholstered Dining Set', 'dining', 'dining', ['solid-wood', 'linen'], ['Oval wood top', 'Six cream chairs', 'Trestle base'], '#e0d3bf'),
  51: P('Two-Tone Leather Sofa', 'sofas', 'living', ['leather', 'foam', 'solid-wood'], ['Contrasting back cushions', 'Low arms', 'Metal legs'], '#d8c7ae'),
  52: P('Curved Wood Accent Chair', 'chairs', 'living', ['solid-wood', 'boucle'], ['Curved wood frame', 'Cream seat', 'Sculptural back'], '#b8916a'),
  53: P('Pedestal Round Dining Set', 'dining', 'dining', ['solid-wood', 'linen'], ['Round top', 'Four upholstered chairs', 'Turned pedestal'], '#8a5a3b'),
  54: P('Oval Meeting Desk', 'tables', 'office', ['solid-wood', 'metal'], ['Oval top', 'Central cable port', 'Metal legs'], '#b8916a'),
  55: P('L-Shaped Executive Desk', 'tables', 'office', ['solid-wood', 'metal'], ['L-shaped top', 'Drawer pedestal', 'Black office chair included in the set'], '#6b4a35'),
  56: P('White Bookshelf', 'storage', 'living', ['solid-wood'], ['Open shelves', 'Low profile', 'White finish'], '#eee9df'),
  57: P('Marble Dining Set for Six', 'dining', 'dining', ['stone', 'solid-wood', 'foam'], ['Rectangular stone top', 'Six upholstered chairs', 'Wood legs'], '#e8e5df'),
  58: P('Teal Channel Armchair', 'chairs', 'living', ['velvet', 'foam', 'solid-wood'], ['Channel-tufted back', 'Curved arms', 'Wood legs'], '#3f6d6a'),
  59: P('White Reception Desk', 'tables', 'office', ['solid-wood', 'metal'], ['L-shaped counter', 'Open display end', 'Cable cut-out'], '#eee9df'),
  60: P('Cream Showroom Sofa Set', 'sofas', 'living', ['linen', 'foam', 'solid-wood'], ['Three-seat sofa', 'Two armchairs', 'Coffee table included in the set'], '#e0d3bf'),
  61: P('Wood Dining Set with Brown Chairs', 'dining', 'dining', ['solid-wood', 'leather'], ['Rectangular top', 'Four brown chairs', 'Trestle legs'], '#8a5a3b'),
  62: P('Blue Channel-Tufted Bed', 'bedroom', 'bedroom', ['velvet', 'foam', 'solid-wood'], ['Channel-tufted headboard', 'Gold trim', 'Slatted base'], '#334d6e'),
  63: P('Wood and Cream Bed', 'bedroom', 'bedroom', ['solid-wood', 'linen'], ['Upholstered headboard', 'Wood frame', 'Under-bed LED strip'], '#b89b78'),
  64: P('Cream Coffee Table', 'tables', 'living', ['solid-wood', 'oak'], ['Lift-up top', 'Lower storage', 'Tapered legs'], '#e6dcc9'),
  65: P('Round Oak Dining Set', 'dining', 'dining', ['oak', 'solid-wood', 'linen'], ['Round oak top', 'Six cream chairs', 'Trestle base'], '#b8916a'),
  66: P('Wood Dining Set for Eight', 'dining', 'dining', ['solid-wood', 'linen'], ['Long rectangular top', 'Eight cream chairs', 'Trestle base'], '#8a5a3b'),
  67: P('Grey Wall Shelf', 'storage', 'living', ['oak', 'metal'], ['Open cubbies', 'Grey frame', 'Wall-mounted'], '#8f8578'),
  68: P('Dark Wood Dining Set for Eight', 'dining', 'dining', ['solid-wood', 'linen'], ['Long dark top', 'Eight beige chairs', 'Trestle base'], '#4d3a2c'),
  69: P('Dark Wood Dining Set with Bench', 'dining', 'dining', ['solid-wood', 'linen'], ['Rectangular top', 'Four chairs and a bench', 'Trestle base'], '#4d3a2c'),
  70: P('Tan Channel Dining Chair', 'chairs', 'dining', ['leather', 'foam', 'metal'], ['Channel-tufted back', 'Padded seat', 'Black metal legs'], '#b98552'),
  71: P('Cream Dining Chair', 'chairs', 'dining', ['linen', 'foam', 'solid-wood'], ['Curved back', 'Upholstered seat', 'Tapered wood legs'], '#e6dcc9'),
  72: P('Brown Conference Chair', 'chairs', 'office', ['leather', 'foam', 'metal'], ['Contoured back', 'White frame', 'Five-star castor base'], '#8a5a3b'),
  73: P('Cream Curved Conversation Set', 'sofas', 'living', ['boucle', 'foam'], ['Two curved seats', 'Round coffee table', 'Deep cushions'], '#e6dcc9'),
  74: P('White Desk with Wood Drawer', 'tables', 'office', ['solid-wood', 'oak'], ['White top', 'Wood drawer', 'Open shelf'], '#eee9df'),
  75: P('Grey Two-Seat Sofa', 'sofas', 'living', ['cotton', 'foam', 'solid-wood'], ['Two seats', 'Slender arms', 'Low wood legs'], '#a6a5a0'),
  76: P('White Ladder Bookshelf', 'storage', 'living', ['solid-wood'], ['Ladder profile', 'Five open shelves', 'Wall anchor supplied'], '#eee9df'),
  77: P('Round Walnut Dining Set', 'dining', 'dining', ['walnut', 'solid-wood', 'linen'], ['Round walnut top', 'Six cream chairs', 'Trestle base'], '#6b4a35'),
  78: P('Brown Curved Bouclé Sofa', 'sofas', 'living', ['boucle', 'foam', 'solid-wood'], ['Curved shell', 'Deep seat', 'Matching poufs'], '#9a6b4f'),
  79: P('Cream Display Cabinet', 'storage', 'dining', ['solid-wood', 'glass'], ['Glass doors', 'Adjustable shelves', 'Display top'], '#e6dcc9'),
  80: P('Grey Sofa with Ottoman', 'sofas', 'living', ['cotton', 'foam', 'solid-wood'], ['Two-seat sofa', 'Matching ottoman', 'Low profile'], '#9b9b96'),
  81: P('Sand Three-Seat Sofa', 'sofas', 'living', ['linen', 'foam', 'solid-wood'], ['Three seats', 'Loose cushions', 'Wood plinth base'], '#c9b299'),
  82: P('Two-Tone Wardrobe', 'storage', 'bedroom', ['solid-wood', 'metal'], ['Open shelving', 'Closed doors', 'Long handles'], '#6b4a35'),
  83: P('Grey Wardrobe with Desk Nook', 'storage', 'bedroom', ['solid-wood'], ['Wardrobe and desk', 'Open shelves', 'Grey finish'], '#a6a5a0'),
  84: P('Grey Channel Bed with Ottoman', 'bedroom', 'bedroom', ['linen', 'foam', 'solid-wood'], ['Channel-tufted headboard', 'Matching ottoman', 'Slatted base'], '#8c8b87'),
  85: P('Open Oak Shelving Unit', 'storage', 'living', ['oak', 'solid-wood'], ['Open shelves', 'Slim oak frame', 'Wall anchor supplied'], '#b8916a'),
  86: P('Oak Desk with Drawers', 'tables', 'office', ['oak', 'solid-wood', 'metal'], ['Three drawers', 'Oak top', 'Castor wheels'], '#b8916a'),
  87: P('Cream Built-In Desk', 'tables', 'office', ['solid-wood'], ['Built-in shelves', 'Desk niche', 'LED lighting'], '#e6dcc9'),
  88: P('White Wall Shelf', 'storage', 'living', ['solid-wood'], ['Open cubbies', 'Slim profile', 'Wall-mounted'], '#eee9df'),
  89: P('Grey Curved Bouclé Sectional', 'sofas', 'living', ['boucle', 'foam', 'solid-wood'], ['Curved sectional', 'Deep seats', 'Loose cushions'], '#9b9b96'),
  90: P('Red Banquet Chair', 'chairs', 'dining', ['velvet', 'foam', 'metal'], ['High back', 'Gold frame', 'Padded seat'], '#8f2f35'),
  91: P('Brown Channel Bed with LED', 'bedroom', 'bedroom', ['velvet', 'foam', 'solid-wood'], ['Channel-tufted headboard', 'Curved corners', 'Under-bed LED strip'], '#8a5a3b'),
  92: P('Cream Curved Sectional', 'sofas', 'living', ['boucle', 'foam', 'solid-wood'], ['Curved sectional', 'Deep seats', 'Low arms'], '#e6dcc9'),
  93: P('Cream Cloud Bed', 'bedroom', 'bedroom', ['boucle', 'foam', 'solid-wood'], ['Rounded channel headboard', 'Upholstered frame', 'Slatted base'], '#e6dcc9'),
  94: P('Cream Sofa with Coffee Table', 'sofas', 'living', ['linen', 'foam', 'solid-wood'], ['Three-seat sofa', 'Grey coffee table', 'Loose cushions'], '#e0d3bf'),
  95: P('White Marble-Top TV Console', 'tables', 'living', ['stone', 'solid-wood'], ['Marble top', 'Drawer storage', 'Cable cut-out'], '#e8e5df'),
  96: P('White Cantilever Chair', 'chairs', 'office', ['leather', 'foam', 'metal'], ['Cantilever frame', 'Ribbed upholstery', 'Chrome base'], '#eee9df'),
  97: P('Beige Showroom Sofa Set', 'sofas', 'living', ['linen', 'foam', 'solid-wood'], ['Three-seat sofa', 'Two armchairs', 'Coffee table included in the set'], '#d8c7ae'),
  98: P('Office Workstation Cluster', 'tables', 'office', ['solid-wood', 'metal'], ['Four-person cluster', 'Privacy screens', 'Cable management'], '#d8d2c6'),
  99: P('Grey Mesh Office Chair', 'chairs', 'office', ['mesh', 'foam', 'metal'], ['Mesh back', 'Adjustable arms', 'Five-star base'], '#8b8b87'),
  100: P('Three-Seat Reception Bench', 'chairs', 'office', ['leather', 'foam', 'metal'], ['Three seats', 'Chrome arms', 'Beam base'], '#2f2f31'),
  101: P('Cream Curved Sofa Set', 'sofas', 'living', ['boucle', 'foam'], ['Curved sofa', 'Two armchairs', 'Round coffee table'], '#e6dcc9'),
  102: P('Black Mesh Office Chair', 'chairs', 'office', ['mesh', 'foam', 'metal'], ['Mesh back', 'Lumbar support', 'Five-star castor base'], '#2f2f31'),
  103: P('Black and Gold TV Console', 'tables', 'living', ['solid-wood', 'metal'], ['Fluted doors', 'Gold trim', 'Open media shelf'], '#2f2f31'),
  104: P('Black and White TV Console', 'tables', 'living', ['solid-wood', 'stone'], ['Marble-look top', 'Drawer storage', 'Cable cut-out'], '#2f2f31'),
  105: P('Cognac Executive Chair', 'chairs', 'office', ['leather', 'foam', 'metal'], ['Padded back', 'Contoured arms', 'Five-star base'], '#8a5a3b'),
  106: P('Black and Silver TV Console', 'tables', 'living', ['solid-wood', 'metal'], ['Fluted front', 'Silver trim', 'Wall-mounted TV ready'], '#2f2f31'),
  107: P('Beige Sofa with Coffee Tables', 'sofas', 'living', ['linen', 'foam', 'solid-wood'], ['Three-seat sofa', 'Two nesting coffee tables', 'Loose cushions'], '#c9b299'),
  108: P('Sand Sofa and Armchair Set', 'sofas', 'living', ['linen', 'foam', 'solid-wood'], ['Three-seat sofa', 'Two armchairs', 'Coffee table included in the set'], '#c9b299'),
  109: P('Yellow Office Chair', 'chairs', 'office', ['mesh', 'foam', 'metal'], ['Tall back', 'Loop arms', 'Five-star castor base'], '#c9a227'),
  110: P('Beige Channel-Tufted Sofa Set', 'sofas', 'living', ['velvet', 'foam', 'solid-wood'], ['Channel-tufted seats', 'Two armchairs', 'Coffee table included in the set'], '#d8c7ae'),
};

const unique = fs.readFileSync('.review/unique.txt', 'utf8').trim().split('\n').map((line) => line.slice(4));
const pieces = [];
for (const [key, item] of Object.entries(ITEMS)) {
  const index = Number(key);
  const file = unique[index - 1];
  if (!file) throw new Error(`No upload for index ${index}`);
  pieces.push({ ...item, file });
}
pieces.sort((a, b) => unique.indexOf(a.file) - unique.indexOf(b.file));

const body =
  '/* Generated by tools/gen-uploads.mjs from the owner\'s photographs.\n' +
  ' * Each entry is one unique picture; byte-identical copies were removed. */\n' +
  'export const UPLOADS = ' + JSON.stringify(pieces, null, 2) + ';\n';
fs.writeFileSync('src/upload-pieces.js', body);
const missing = unique.filter((f) => !pieces.some((p) => p.file === f));
console.log('pieces', pieces.length, 'unique uploads', unique.length, 'unused', missing.length);
console.log('unused:', missing.join('\n'));
