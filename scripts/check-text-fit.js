#!/usr/bin/env node
/*
 * Text fit check (npm run check:fit): the "no mid-word break" rule of TileTitle, for every language.
 * A text may wrap only between words. For each place where a translated text has little room
 * (category tiles, big page titles, buttons, segmented controls, chips, navigation titles) the
 * longest word is measured with the real Onest font (advance widths + the guide letter spacing) on
 * the narrowest iPhone (375 pt):
 *   - fits at 100%                        → ok
 *   - fits only smaller, where the place shrinks (TileTitle / NoBreakText 70%, one-line buttons 80%,
 *     Segmented 75%) → ok, counted as "shrinks"
 *   - doesn't fit                          → FAIL (the word would break in the middle, or end with "…")
 *
 *   node scripts/check-text-fit.js           → all languages
 *   node scripts/check-text-fit.js de fi hu  → only those
 *   node scripts/check-text-fit.js --verbose → also the texts that shrink
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const I18N = path.join(ROOT, 'src', 'i18n');
const FONT_DIR = path.join(ROOT, 'node_modules', '@expo-google-fonts', 'onest');

// ---- Font metrics (TrueType: head, hhea, hmtx, cmap formats 4 and 12) ----

function loadFont(file) {
  const buf = fs.readFileSync(file);
  const tables = {};
  const count = buf.readUInt16BE(4);
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    tables[buf.toString('ascii', at, at + 4)] = buf.readUInt32BE(at + 8);
  }
  const unitsPerEm = buf.readUInt16BE(tables.head + 18);
  const metrics = buf.readUInt16BE(tables.hhea + 34);
  const advance = (glyph) => buf.readUInt16BE(tables.hmtx + 4 * Math.min(glyph, metrics - 1));
  const map = new Map();
  const cmap = tables.cmap;
  const subtables = buf.readUInt16BE(cmap + 2);
  for (let i = 0; i < subtables; i++) {
    const offset = cmap + buf.readUInt32BE(cmap + 4 + i * 8 + 4);
    const format = buf.readUInt16BE(offset);
    if (format === 4) {
      const segX2 = buf.readUInt16BE(offset + 6);
      const ends = offset + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const ranges = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = buf.readUInt16BE(ends + s * 2);
        const start = buf.readUInt16BE(starts + s * 2);
        const delta = buf.readInt16BE(deltas + s * 2);
        const range = buf.readUInt16BE(ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let glyph;
          if (range === 0) glyph = (c + delta) & 0xffff;
          else {
            const at = ranges + s * 2 + range + (c - start) * 2;
            glyph = buf.readUInt16BE(at);
            if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
          }
          if (glyph && !map.has(c)) map.set(c, glyph);
        }
      }
    } else if (format === 12) {
      const groups = buf.readUInt32BE(offset + 12);
      for (let g = 0; g < groups; g++) {
        const at = offset + 16 + g * 12;
        const start = buf.readUInt32BE(at);
        const end = buf.readUInt32BE(at + 4);
        const first = buf.readUInt32BE(at + 8);
        for (let c = start; c <= end; c++) if (!map.has(c)) map.set(c, first + (c - start));
      }
    }
  }
  return { unitsPerEm, advance, map };
}

const FONTS = {
  400: loadFont(path.join(FONT_DIR, '400Regular', 'Onest_400Regular.ttf')),
  500: loadFont(path.join(FONT_DIR, '500Medium', 'Onest_500Medium.ttf')),
  600: loadFont(path.join(FONT_DIR, '600SemiBold', 'Onest_600SemiBold.ttf')),
  700: loadFont(path.join(FONT_DIR, '700Bold', 'Onest_700Bold.ttf')),
};
const missingGlyphs = new Set();

// Width in points of a text at a size and weight, with the guide letter spacing (+0.02em, titles +0.005em)
function measure(text, size, weight) {
  const font = FONTS[weight];
  const tracking = size >= 28 ? 0.005 : 0.02;
  let width = 0;
  for (const ch of text) {
    const glyph = font.map.get(ch.codePointAt(0));
    if (glyph === undefined) {
      missingGlyphs.add(ch); // drawn by the iOS fallback font: estimated
      width += size * (ch.codePointAt(0) >= 0x370 ? 0.62 : 0.6);
    } else {
      width += (font.advance(glyph) / font.unitsPerEm) * size;
    }
    width += size * tracking;
  }
  return width;
}

// ---- Places with little room, on a 375 pt iPhone (Spacing.side 22, TILE_GAP 14) ----

const SCREEN = 375;
const CONTENT = SCREEN - 22 * 2; // 331
const TILE = Math.floor((SCREEN - 44 - 14) / 2); // 158

// mode "words": wraps between words, every word must fit; "line": one line (with minScale if it shrinks)
const PLACES = {
  categoryTile: { label: 'category tile', size: 17, weight: 600, width: TILE - 32, mode: 'words', minScale: 0.7 },
  folderTitle: { label: 'folder title', size: 30, weight: 700, width: CONTENT, mode: 'words', minScale: 0.7 },
  pageTitle: { label: 'page title', size: 30, weight: 700, width: CONTENT, mode: 'words', minScale: 0.7 },
  bigTitle: { label: 'big title', size: 28, weight: 700, width: CONTENT, mode: 'words', minScale: 0.7 },
  primaryButton: { label: 'button', size: 16, weight: 600, width: CONTENT - 40 - 26, mode: 'words', minScale: 0.7 },
  lineButton: { label: 'button', size: 16, weight: 600, width: CONTENT - 40 - 26, mode: 'line', minScale: 0.8 },
  rowButton: { label: 'button in a row', size: 16, weight: 600, width: (CONTENT - 10) / 2 - 40 - 26, mode: 'line', minScale: 0.8 },
  chip: { label: 'chip', size: 15, weight: 600, width: CONTENT - 32, mode: 'words', minScale: 1 },
  navTitle: { label: 'navigation title', size: 17, weight: 600, width: SCREEN - 2 * 88, mode: 'line', minScale: 1 },
};
const segment = (n) => ({ label: `segmented (${n})`, size: 15, weight: 600, width: (CONTENT - 8 - 5 * (n - 1)) / n - 20, mode: 'line', minScale: 0.75 });

// ---- Which keys go where: read from the source ----

const slots = []; // { key, place }
const addKeys = (node, place, sf) => {
  const visit = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 't') {
      const arg = n.arguments[0];
      if (arg && ts.isStringLiteral(arg)) slots.push({ key: arg.text, place, where: where(sf, n) });
      else if (arg && ts.isTemplateExpression(arg)) slots.push({ prefix: arg.head.text, place, where: where(sf, n) });
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
};
const where = (sf, n) => `${path.relative(ROOT, sf.fileName)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;

function sourceFiles(dir) {
  return fs.readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) return name === 'i18n' ? [] : sourceFiles(p);
    return /\.tsx$/.test(name) ? [p] : [];
  });
}

for (const file of sourceFiles(path.join(ROOT, 'src'))) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(sf);
      const props = Object.fromEntries(
        node.attributes.properties.filter(ts.isJsxAttribute).map((a) => [a.name.getText(sf), a.initializer]),
      );
      // singleLine: one line that shrinks; with a style (half width) it sits in a row of two
      const singleLine = 'singleLine' in props;
      const button = singleLine ? ('style' in props ? 'rowButton' : 'lineButton') : 'primaryButton';
      if ((tag === 'PrimaryButton' || tag === 'SecondaryButton') && props.label) addKeys(props.label, button, sf);
      if (tag === 'PageHeader' && props.title) addKeys(props.title, 'pageTitle', sf);
      if (tag === 'Chip' && props.label) addKeys(props.label, 'chip', sf);
      if (tag === 'Segmented' && props.values) {
        const values = props.values.expression;
        const n = values && ts.isArrayLiteralExpression(values) ? values.elements.length : 2;
        PLACES[`segmented${n}`] = segment(n);
        addKeys(props.values, `segmented${n}`, sf);
      }
      if (tag === 'Stack.Toolbar.Button') {
        const parent = node.parent;
        if (ts.isJsxElement(parent)) addKeys(parent, 'navTitle', sf);
      }
    }
    // Native header titles: options={{ title: t('…') }}
    if (ts.isPropertyAssignment(node) && node.name.getText(sf) === 'title' && /_layout\.tsx$/.test(file)) {
      addKeys(node.initializer, 'navTitle', sf);
    }
    // Big titles: <Text style={styles.title}> with a 28–30 font in this file
    if (ts.isJsxElement(node) && /^(Text|ThemedText)$/.test(node.openingElement.tagName.getText(sf))) {
      const style = node.openingElement.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === 'style');
      if (style && /styles\.(title|hello)\b/.test(style.getText(sf)) && /fontSize: (28|30)\b/.test(sf.text)) {
        addKeys(node, /fontSize: 30\b/.test(sf.text) ? 'pageTitle' : 'bigTitle', sf);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
// Category names: tiles of Home and the big title of the folder
for (const place of ['categoryTile', 'folderTitle']) slots.push({ prefix: 'categories.builtin.', place, where: 'category name' });
// Palette names in Aspetto cards: one line at 17
slots.push({ prefix: 'palettes.', place: 'chip', where: 'appearance' });

// ---- Check every language ----

function flatten(object, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(object)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, full, out);
    else out.set(full, String(value));
  }
  return out;
}

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const wanted = args.filter((a) => !a.startsWith('--'));
const languages = fs
  .readdirSync(I18N)
  .filter((f) => /^[a-z]{2}(-[A-Z]{2})?\.json$/.test(f))
  .map((f) => f.replace('.json', ''))
  .filter((l) => wanted.length === 0 || wanted.includes(l));

const PLURAL = /_(zero|one|two|few|many|other)$/;
let failures = 0;
let shrinks = 0;
for (const lang of languages) {
  const texts = flatten(JSON.parse(fs.readFileSync(path.join(I18N, `${lang}.json`), 'utf8')));
  if (texts.size === 0) continue;
  const seen = new Set();
  for (const slot of slots) {
    const place = PLACES[slot.place];
    const keys = [...texts.keys()].filter((k) => {
      const base = k.replace(PLURAL, '');
      return slot.key ? base === slot.key : base.startsWith(slot.prefix);
    });
    for (const key of keys) {
      const id = `${key}|${slot.place}`;
      if (seen.has(id)) continue;
      seen.add(id);
      // {{variables}} → a typical value
      const text = texts.get(key).replace(/\{\{\s*count\s*\}\}/g, '12').replace(/\{\{[^}]+\}\}/g, 'Xxxxxxx');
      const parts = place.mode === 'words' ? text.split(/\s+/).filter(Boolean) : [text];
      const widest = parts.reduce((best, w) => {
        const width = measure(w, place.size, place.weight);
        return width > best.width ? { word: w, width } : best;
      }, { word: '', width: 0 });
      if (widest.width <= place.width) continue;
      const scale = place.width / widest.width;
      if (scale >= place.minScale) {
        shrinks++;
        if (verbose) console.log(`  ${lang}: ${place.label} shrinks to ${Math.round(scale * 100)}%: "${widest.word}" (${key})`);
      } else {
        failures++;
        console.log(
          `✖ ${lang}: ${place.label}: "${widest.word}" is ${Math.round(widest.width)} pt, room ${Math.round(place.width)} pt` +
            (place.minScale < 1 ? ` (even at ${Math.round(place.minScale * 100)}%)` : '') +
            ` — ${key} (${slot.where})`,
        );
      }
    }
  }
}

if (missingGlyphs.size) console.log(`(not in Onest, estimated with the iOS fallback font: ${[...missingGlyphs].slice(0, 30).join('')}…)`);
if (failures) {
  console.error(`\n✖ text fit: ${failures} text${failures === 1 ? '' : 's'} would break inside a word or be cut`);
  process.exit(1);
}
console.log(`✓ text fit: ${languages.length} languages, no word breaks${shrinks ? ` (${shrinks} texts shrink to fit)` : ''}`);
