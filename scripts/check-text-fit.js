#!/usr/bin/env node
/*
 * Text fit check (npm run check:fit): no word is ever broken in the middle or cut, in any language,
 * on any iPhone width and at any Dynamic Type size. Words are measured with the real fonts (Onest;
 * San Francisco for the letters Onest doesn't have) and the guide letter spacing.
 *
 * 1. Every language at the design size (375 pt, default text).
 * 2. A matrix for Italian, English, German and Finnish: widths 320 (iPhone SE), 375, 393, 430 ×
 *    text sizes from xSmall to AX5. Texts grow up to 200 % (components/text.tsx MAX_FONT_SCALE,
 *    Apple's "Larger Text"), so beyond it the size stays at 200 %.
 *
 * What each place does when a word is too wide (the rules of the app):
 *  - tiles (TileTitle): one column with large text (XXL+); otherwise shrink to 85 %, then one
 *    column when a word does not fit or a name needs more than 2 lines — fail if it still does not fit
 *  - page titles, buttons, chips (NoBreakText): shrink to 85 % — fail below
 *  - one-line buttons: shrink to 85 % (wrap between words above 130 % text) — fail below
 *  - segmented controls: one line per option; if any option doesn't fit, a vertical list of options
 *    where every word must fit at full size — fail otherwise
 *  - rows (icon + title + switch/value): the control moves below; with large text the icon goes
 *    above the title, which then has the whole row;
 *    every word must fit at full size
 *  - form rows (documento, tessera, password, categoria, persona): beside the icon, or with large
 *    text under it with the whole card width
 *  - any other text (paragraphs, notes) in a card: every word must fit at full size
 *  - navigation titles: one line at the design size (iOS ends them with "…" otherwise)
 *
 *   node scripts/check-text-fit.js           → everything
 *   node scripts/check-text-fit.js de fi     → only those languages
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
// Letters Onest doesn't have (Greek) are drawn by iOS with San Francisco: measured with the Mac's
// SF (regular, a little wider for heavier weights) when it's there, otherwise estimated
const SF_PATH = '/System/Library/Fonts/SFNS.ttf';
const SF = fs.existsSync(SF_PATH) ? loadFont(SF_PATH) : null;
const SF_WEIGHT = { 400: 1, 500: 1.02, 600: 1.04, 700: 1.06 };

// Width in points of a text at a size and weight, with the guide letter spacing (+0.02em, titles +0.005em)
function measure(text, size, weight) {
  const font = FONTS[weight];
  const tracking = size >= 28 ? 0.005 : 0.02;
  let width = 0;
  for (const ch of text) {
    const glyph = font.map.get(ch.codePointAt(0));
    if (glyph === undefined) {
      const fallback = SF?.map.get(ch.codePointAt(0));
      if (fallback !== undefined) width += (SF.advance(fallback) / SF.unitsPerEm) * size * SF_WEIGHT[weight];
      else {
        missingGlyphs.add(ch);
        width += size * 0.62;
      }
    } else {
      width += (font.advance(glyph) / font.unitsPerEm) * size;
    }
    width += size * tracking;
  }
  return width;
}

// ---- Places with little room, as functions of the screen width W (Spacing.side 22, TILE_GAP 14) ----

const SIDE = 22;
// hooks/use-large-text.ts: from XXL (2 steps above the default) grids have one column and a row's
// leading icon sits above its title
const LARGE_TEXT_SCALE = 21 / 17 - 0.01;
const CARD_PAD = 16; // inside a white card
// mode "words": wraps between words, every word must fit (minScale: how far it may shrink)
// mode "line": one line (minScale: how far it may shrink)
const PLACES = {
  // 2 columns; 1 column with large text, or when a word doesn't fit or the name needs more than 2 lines
  categoryTile: (W, scale) => {
    const one = W - SIDE * 2 - 32;
    const two = Math.floor((W - SIDE * 2 - 14) / 2) - 32;
    return { label: 'category tile', size: 17, weight: 600, mode: 'words', minScale: 0.85, lines: 2,
      width: scale >= LARGE_TEXT_SCALE ? one : two, fallback: one };
  },
  folderTitle: (W) => ({ label: 'folder title', size: 30, weight: 700, mode: 'words', minScale: 0.5, autoFit: true, cap: 1.25, width: W - SIDE * 2 }),
  pageTitle: (W) => ({ label: 'page title', size: 30, weight: 700, mode: 'words', minScale: 0.5, autoFit: true, cap: 1.25, width: W - SIDE * 2 }),
  bigTitle: (W) => ({ label: 'big title', size: 28, weight: 700, mode: 'words', minScale: 0.5, autoFit: true, cap: 1.25, width: W - SIDE * 2 }),
  primaryButton: (W) => ({ label: 'button', size: 16, weight: 600, mode: 'words', minScale: 0.85, width: W - SIDE * 2 - 40 - 26 }),
  lineButton: (W, scale) => ({ label: 'button', size: 16, weight: 600, mode: scale > 1.3 ? 'words' : 'line', minScale: 0.85,
    width: W - SIDE * 2 - 40 - 26 }),
  rowButton: (W, scale) => {
    // above 130 % or under 360 pt the two buttons stack (DetailActionBar), each with the full width
    const stacked = scale > 1.3 || W < 360;
    return { label: 'button in a row', size: 16, weight: 600, mode: stacked ? 'words' : 'line', minScale: 0.85,
      width: stacked ? W - SIDE * 2 - 40 - 26 : (W - SIDE * 2 - 10) / 2 - 40 - 26 };
  },
  chip: (W) => ({ label: 'chip', size: 15, weight: 600, mode: 'words', minScale: 0.85, width: W - SIDE * 2 - 32 }),
  // rows and plain texts: the app Text makes a too-long word smaller instead of breaking it
  // (counted as "fitted"); fail only if it would need less than 50 %
  // with large text the icon goes above the title: the title has the whole row
  row: (W, scale) => ({ label: 'row title', size: 16, weight: 500, mode: 'words', minScale: 0.5, autoFit: true,
    width: W - SIDE * 2 - CARD_PAD * 2 - (scale >= LARGE_TEXT_SCALE ? 0 : 36 + 12) }),
  text: (W) => ({ label: 'text', size: 16, weight: 400, mode: 'words', minScale: 0.5, autoFit: true, width: W - SIDE * 2 - CARD_PAD * 2 }),
  // The rows of the forms (Nuovo/Modifica documento, Nuova tessera, Nuova password, Nuova categoria,
  // Nuova persona): icon + label in a card; from XXL the icon above, the label across the card
  formRow: (W, scale) => ({ label: 'form row', size: 15, weight: 500, mode: 'words', minScale: 0.5, autoFit: true,
    width: W - SIDE * 2 - CARD_PAD * 2 - (scale >= LARGE_TEXT_SCALE ? 0 : 36 + 12) }),
  // Scadenze, the selected day panel (dayBox: page − 2×14 padding, dot 8 + gap 10): by default
  // the amount / "promemoria" on the name's line (at least 90 pt left for the name); with large
  // text under the name, left-aligned, with the whole width (FitLine)
  daySide: (W, scale) => ({ label: 'Scadenze day row', size: 13, weight: 500, minScale: 0.5, autoFit: true,
    mode: scale >= LARGE_TEXT_SCALE ? 'words' : 'line',
    width: scale >= LARGE_TEXT_SCALE ? W - SIDE * 2 - 28 - 18 : W - SIDE * 2 - 28 - 18 - 10 - 90 }),
  // section titles ("DA SISTEMARE", "QUESTA SETTIMANA", the months of Scadenze; Home): 13 pt
  // capitals, the action under the title when both don't fit
  sectionTitle: (W) => ({ label: 'section title', size: 13, weight: 400, mode: 'words', minScale: 0.5, autoFit: true, upper: true,
    width: W - SIDE * 2 }),
  navTitle: (W) => ({ label: 'navigation title', size: 17, weight: 600, mode: 'line', minScale: 1, width: W - 2 * 88, fixed: true }),
};
// A segmented control in a card: one line per segment, or the vertical list (option row padding
// 14 + the check mark 23)
const segmentRoom = (W, n, symbols) => (W - SIDE * 2 - CARD_PAD * 2 - 8) / n - 20 - (symbols ? 19 : 0);
const segmentListRoom = (W) => W - SIDE * 2 - CARD_PAD * 2 - 8 - 28 - 23;

// ---- Which keys go where: read from the source ----

const slots = []; // { key, place }
const segmentGroups = []; // { keys, count, symbols, where }
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
        // the options of one control together: whether they fit depends on all of them
        const keys = [];
        const visitKeys = (n) => {
          if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 't' && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
            keys.push(n.arguments[0].text);
          }
          ts.forEachChild(n, visitKeys);
        };
        visitKeys(props.values);
        const values = props.values.expression;
        const count = values && ts.isArrayLiteralExpression(values) ? values.elements.length : keys.length;
        if (keys.length) segmentGroups.push({ keys, count: Math.max(count, keys.length), symbols: 'symbols' in props, where: where(sf, node) });
      }
      if ((tag === 'SettingsRow' || tag === 'Row') && props.label) addKeys(props.label, 'row', sf);
      if (tag === 'SectionHeader') {
        if (props.title) addKeys(props.title, 'sectionTitle', sf);
        if (props.action) addKeys(props.action, 'sectionTitle', sf);
      }
      // Text buttons of the native toolbar: the text between the tags (not the accessibility label)
      if (tag === 'Stack.Toolbar.Button' && ts.isJsxOpeningElement(node)) {
        for (const child of node.parent.children) addKeys(child, 'navTitle', sf);
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
// The forms: every text of their namespaces is laid out as a form row
for (const prefix of ['documentForm.', 'cardForm.', 'passwordForm.', 'categoryForm.', 'personForm.', 'coverField.']) {
  slots.push({ prefix, place: 'formRow', where: 'form rows' });
}
// Scadenze: the trailing label of the selected day's rows, and the section titles of the list
for (const key of ['deadlines.dayRepeats', 'deadlines.dayReminder']) slots.push({ key, place: 'daySide', where: 'Scadenze day panel' });
slots.push({ prefix: 'deadlineUtils.', place: 'sectionTitle', where: 'Scadenze sections' });
// Palette names in Aspetto cards
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
const MATRIX_LANGUAGES = ['it', 'en', 'de', 'fi'];
const WIDTHS = [320, 375, 393, 430];
// iOS Dynamic Type (body 17 pt): xS 14, S 15, M 16, L 17 (default), XL 19, XXL 21, XXXL 23, AX1 28,
// AX2 33, AX3 40, AX4 47, AX5 53 → React Native fontScale
const SCALES = [
  ['xS', 14 / 17], ['L', 1], ['XL', 19 / 17], ['XXXL', 23 / 17], ['AX1', 28 / 17], ['AX2', 33 / 17], ['AX3', 40 / 17], ['AX5', 53 / 17],
];
const MAX_SCALE = 2; // components/text.tsx

const NUMERIC = /\{\{\s*(count|number|page|total|position|used|limit|days|min|size|percent|intensity|current|year|years|pages)\s*\}\}/g;
const sample = (text) => text.replace(NUMERIC, '12').replace(/\{\{[^}]+\}\}/g, 'Xxxxxxx');
const widestWord = (text, size, weight) =>
  text.split(/\s+/).filter(Boolean).reduce((best, w) => {
    const width = measure(w, size, weight);
    return width > best.width ? { word: w, width } : best;
  }, { word: '', width: 0 });

let failures = 0;
let shrinks = 0;
let fitted = 0; // plain texts made smaller by the app Text so a long word stays whole
// Keys never drawn by our Text on screen: spoken by VoiceOver, system alerts, notifications, the
// iPhone calendar, the accountant PDF, file names, share messages, demo content
const NOT_ON_SCREEN = /^(a11y\.|deadlineReminders\.|calendarSync\.|taxPackageBuilder\.|sendFileName\.|sendPrepare\.|createBackup\.|restoreBackup\.|backupCrypto\.|zipReader\.|appActions\.|demoData\.|documentTypes\.|shareCopies\.)|\.alerts\.|[Aa]ccessibility|Hint$|Label$/;
const reported = new Set();
function fail(message) {
  if (reported.has(message)) return;
  reported.add(message);
  failures++;
  console.log(`✖ ${message}`);
}

function checkLanguage(lang, W, scaleName, scale) {
  const texts = flatten(JSON.parse(fs.readFileSync(path.join(I18N, `${lang}.json`), 'utf8')));
  if (texts.size === 0) return;
  const at = `${lang} ${W}pt ${scaleName}`;
  const eff = Math.min(scale, MAX_SCALE);
  const keysFor = (slot) =>
    [...texts.keys()].filter((k) => {
      const base = k.replace(PLURAL, '');
      return slot.key ? base === slot.key : base.startsWith(slot.prefix);
    });
  const covered = new Set();

  for (const slot of slots) {
    const place = PLACES[slot.place](W, scale);
    if (place.fixed && (W !== 375 || scale !== 1)) continue; // native titles: design size only
    // big titles grow up to 125 % (TileTitle) and get smaller instead of breaking a word
    const size = place.fixed ? place.size : place.size * Math.min(eff, place.cap ?? MAX_SCALE);
    for (const key of keysFor(slot)) {
      covered.add(key);
      if (NOT_ON_SCREEN.test(key)) continue;
      const text = place.upper ? sample(texts.get(key)).toUpperCase() : sample(texts.get(key));
      const widest = place.mode === 'words' ? widestWord(text, size, place.weight) : { word: text, width: measure(text, size, place.weight) };
      // more lines than allowed (estimate: the whole text over the line width) → the 1-column layout
      if (place.lines && place.fallback && measure(text, size, place.weight) > place.width * place.lines) {
        if (widest.width <= place.fallback) continue;
      }
      if (widest.width <= place.width) continue;
      const needed = place.width / widest.width;
      if (place.autoFit && needed >= place.minScale) {
        fitted++;
        if (verbose) console.log(`  ${at}: ${place.label} made smaller to ${Math.round(needed * 100)}%: "${widest.word}" (${key})`);
        continue;
      }
      if (needed >= place.minScale) {
        shrinks++;
        if (verbose) console.log(`  ${at}: ${place.label} shrinks to ${Math.round(needed * 100)}%: "${widest.word}" (${key})`);
        continue;
      }
      // a tile grid goes to one column
      if (place.fallback && widest.width * place.minScale <= place.fallback) continue;
      fail(`${at}: ${place.label}: "${widest.word}" ${Math.round(widest.width)} pt, room ${Math.round(place.fallback ?? place.width)} pt` +
        (place.minScale < 1 ? ` (even at ${Math.round(place.minScale * 100)} %)` : '') + ` — ${key} (${slot.where})`);
    }
  }

  // Segmented controls: one line each, or the vertical list
  for (const group of segmentGroups) {
    const labels = group.keys.filter((k) => texts.has(k)).map((k) => [k, sample(texts.get(k))]);
    labels.forEach(([k]) => covered.add(k));
    const size = 15 * eff;
    const room = segmentRoom(W, group.count, group.symbols);
    const oneLine = labels.every(([, text]) => measure(text, size, 600) <= room);
    if (oneLine) continue;
    const listRoom = segmentListRoom(W);
    for (const [key, text] of labels) {
      const widest = widestWord(text, size, 600);
      if (widest.width <= listRoom) continue;
      if (listRoom / widest.width >= 0.85) shrinks++;
      else fail(`${at}: segmented (list): "${widest.word}" ${Math.round(widest.width)} pt, room ${Math.round(listRoom)} pt (even at 85 %) — ${key} (${group.where})`);
    }
  }

  // Every other text: its words fit a card at full size
  const place = PLACES.text(W);
  for (const [key, value] of texts) {
    if (covered.has(key) || NOT_ON_SCREEN.test(key)) continue;
    const widest = widestWord(sample(value), place.size * eff, place.weight);
    if (widest.width <= place.width) continue;
    if (place.width / widest.width >= place.minScale) fitted++;
    else fail(`${at}: text: "${widest.word}" ${Math.round(widest.width)} pt, room ${Math.round(place.width)} pt — ${key}`);
  }
}

for (const lang of languages) {
  checkLanguage(lang, 375, 'L', 1);
  checkLanguage(lang, 320, 'AX1+ (200 %)', MAX_SCALE); // the narrowest phone at the largest size used
}
for (const lang of MATRIX_LANGUAGES.filter((l) => languages.includes(l))) {
  for (const W of WIDTHS) for (const [name, scale] of SCALES) checkLanguage(lang, W, name, scale);
}

if (missingGlyphs.size) console.log(`(in no font here, estimated: ${[...missingGlyphs].slice(0, 30).join('')}…)`);
if (failures) {
  console.error(`\n✖ text fit: ${failures} text${failures === 1 ? '' : 's'} would break inside a word or be cut`);
  process.exit(1);
}
console.log(
  `✓ text fit: ${languages.length} languages at 375 pt and at 320 pt × 200 %, it/en/de/fi at ${WIDTHS.join('/')} pt × xS–AX5: ` +
    `no word broken or cut (${shrinks} shrink at most to 85 %, ${fitted} long words made smaller by Text)`,
);
