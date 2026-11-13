#!/usr/bin/env node
/* global __dirname */
/*
 * Contrast check (npm run check:contrast): every text/background and icon/control pair of the app palettes
 * (light, "Tema notte" and their "Aumenta contrasto" versions) and the tiles of the 7 category palettes, as
 * shown (utils/colors readableColors). WCAG AA: 4.5:1 for text, 3:1 for icons and controls. Exit 1 if any fails.
 */
const path = require('path'), fs = require('fs'), Module = require('module');
const ROOT = path.join(__dirname, '..');
const ts = require(ROOT + '/node_modules/typescript');
const STUBS = { '@/i18n': { t: (k) => k }, '@/global.css': {}, 'expo-sqlite/kv-store': { getItemSync: () => null }, 'react-native': { Appearance: { getColorScheme: () => 'light' }, Platform: { select: (o) => o.ios } } };
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, parent, ...rest) {
  if (STUBS[req]) return req;
  if (req.startsWith('@/')) { const base = path.join(ROOT, 'src', req.slice(2)); for (const ext of ['.ts', '.tsx', '/index.ts']) if (fs.existsSync(base + ext)) return base + ext; }
  return origResolve.call(this, req, parent, ...rest);
};
for (const [k, v] of Object.entries(STUBS)) require.cache[k] = { id: k, filename: k, loaded: true, exports: v };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText, f);

const { LIGHT, DARK, LIGHT_HIGH_CONTRAST, DARK_HIGH_CONTRAST } = require(ROOT + '/src/constants/theme.ts');
const { PALETTES } = require(ROOT + '/src/constants/palettes.ts');
const colors = require(ROOT + '/src/utils/colors.ts');
const { BRAND_GRADIENT: BRAND } = require(ROOT + '/src/constants/brand.ts');

function lum(hex) {
  const v = parseInt(hex.replace('#', '').slice(0, 6), 16);
  const c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const out = [];
function check(theme, what, fg, bg, need) {
  if (!/^#[0-9a-f]{6}/i.test(fg) || !/^#[0-9a-f]{6}/i.test(bg)) return;
  const r = ratio(fg, bg);
  out.push({ theme, what, fg, bg, r: Math.round(r * 100) / 100, need, ok: r >= need });
}
for (const [name, p] of [['light', LIGHT], ['dark', DARK], ['lightHC', LIGHT_HIGH_CONTRAST], ['darkHC', DARK_HIGH_CONTRAST]]) {
  for (const bg of ['background', 'surface']) {
    check(name, `text on ${bg}`, p.text, p[bg], 4.5);
    check(name, `textSecondary on ${bg}`, p.textSecondary, p[bg], 4.5);
    check(name, `accent (links) on ${bg}`, p.accent, p[bg], 4.5);
    check(name, `iconGrey (icons) on ${bg}`, p.iconGrey, p[bg], 3);
    check(name, `placeholder on ${bg}`, p.placeholder, p[bg], 4.5);
    check(name, `error text on ${bg}`, p.error, p[bg], 4.5);
    check(name, `success text on ${bg}`, p.success, p[bg], 4.5);
    check(name, `heart icon on ${bg}`, p.heart, p[bg], 3);
    check(name, `switch off track on ${bg}`, p.switchOff, p[bg], 3);
    check(name, `dashed add-tile border on ${bg}`, p.dashed, p[bg], 3);
  }
  check(name, 'textSecondary on elevated', p.textSecondary, p.elevated, 4.5);
  check(name, 'text on lilac (fields)', p.text, p.lilac, 4.5);
  check(name, 'placeholder on lilac (fields)', p.placeholder, p.lilac, 4.5);
  check(name, 'indigo on lilac (buttons)', p.indigo, p.lilac, 4.5);
  check(name, 'textOnLilac on paleLilac', p.textOnLilac, p.paleLilac, 4.5);
  check(name, 'segmented active text', p.segmentedActiveText, p.segmentedActive, 4.5);
  check(name, 'textSecondary on lilac (inactive segment)', p.textSecondary, p.lilac, 4.5);
  check(name, 'error on errorBackground (Da pagare)', p.error, p.errorBackground, 4.5);
  check(name, 'success on successBackground (Pagata)', p.success, p.successBackground, 4.5);
  check(name, 'white on badge', '#FFFFFF', p.badge, 4.5);
  check(name, 'white on destructive button', '#FFFFFF', p.destructive, 4.5);
  check(name, 'white on brand gradient start', '#FFFFFF', BRAND[0], 4.5);
  check(name, 'white on brand gradient end', '#FFFFFF', BRAND[1], 4.5);
  check(name, 'accent on lilac', p.accent, p.lilac, 4.5);
  // Category tiles (gradient + text) and tints, every palette
  for (const pal of PALETTES) {
    pal.colors.map(colors.readableColors).forEach((c, i) => {
      const label = `${pal.id} #${i + 1}`;
      check(name, `tile text on gradient top (${label})`, c.text, c.top, 4.5);
      check(name, `tile text on gradient bottom (${label})`, c.text, c.bottom, 4.5);
      const tint = colors.categoryTint(c, p);
      check(name, `onTint on tint (${label})`, tint.onTint, tint.tint, 4.5);
      check(name, `categoryInk on page (${label})`, colors.categoryInk(c, p), p.background, 3);
    });
  }
}
const fails = out.filter((o) => !o.ok);
console.log(`${out.length} pairs, ${fails.length} below AA`);
for (const f of fails) console.log(`${f.theme.padEnd(5)} ${f.r.toFixed(2).padStart(5)} < ${f.need}  ${f.what}  ${f.fg} on ${f.bg}`);
if (fails.length) process.exit(1);
console.log('✓ contrast: every pair reaches WCAG AA');
