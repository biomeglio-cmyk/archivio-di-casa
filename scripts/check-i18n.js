#!/usr/bin/env node
/*
 * i18n check (npm run check:i18n). Fails (exit 1) when:
 *  1. it.json and en.json don't have the same keys (plural forms included), or a {{variable}}
 *     differs between the two;
 *  2. a t('key') in src/ points to a key that isn't in it.json;
 *  3. a hardcoded user-facing string is left in src/: JSX text, a string in a user-facing prop
 *     (label, title, placeholder, accessibilityLabel…) or Alert, or any string that looks Italian.
 *
 * Exceptions: a line with `i18n-ignore` (or the line before it) is skipped; a file with
 * `i18n-ignore-file` is skipped (database seeds and migrations keep their Italian data).
 *
 *   node scripts/check-i18n.js            → check everything
 *   node scripts/check-i18n.js src/app/x  → only the strings of those files/folders (keys still checked)
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const I18N = path.join(SRC, 'i18n');

// ---- 1. Locale files ----

function readLocale(lang) {
  const merged = JSON.parse(fs.readFileSync(path.join(I18N, `${lang}.json`), 'utf8'));
  // Work in progress: extra parts in src/i18n/parts/<name>.<lang>.json are merged in
  const partsDir = path.join(I18N, 'parts');
  if (fs.existsSync(partsDir)) {
    for (const file of fs.readdirSync(partsDir).filter((f) => f.endsWith(`.${lang}.json`))) {
      deepMerge(merged, JSON.parse(fs.readFileSync(path.join(partsDir, file), 'utf8')), file);
    }
  }
  return merged;
}

function deepMerge(target, source, origin) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object') {
      target[key] = target[key] && typeof target[key] === 'object' ? target[key] : {};
      deepMerge(target[key], value, origin);
    } else {
      if (key in target && target[key] !== value) errors.push(`${origin}: key "${key}" defined twice`);
      target[key] = value;
    }
  }
}

function flatten(object, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(object)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, full, out);
    else out.set(full, String(value));
  }
  return out;
}

const errors = [];
const it = flatten(readLocale('it'));
const en = flatten(readLocale('en'));
const variables = (text) => [...text.matchAll(/\{\{\s*([\w.]+)[^}]*\}\}/g)].map((m) => m[1]).sort().join(',');

const PLURAL = /_(zero|one|two|few|many|other)$/;
// A plural key "a.b_one" → base "a.b"; the base keys and the plain keys of a file
function shape(map) {
  const plain = new Map();
  const plurals = new Map(); // base → Map(category → text)
  for (const [key, value] of map) {
    const m = PLURAL.exec(key);
    if (m) {
      const base = key.slice(0, -m[0].length);
      if (!plurals.has(base)) plurals.set(base, new Map());
      plurals.get(base).set(m[1], value);
    } else plain.set(key, value);
  }
  return { plain, plurals };
}

// The categories a language really uses for counts (whole numbers 0–1000 and a few millions):
// Russian one/few/many, Slovenian one/two/few/other, English one/other…
function requiredCategories(lang) {
  const rules = new Intl.PluralRules(lang);
  const used = new Set();
  for (let n = 0; n <= 1000; n++) used.add(rules.select(n));
  return used;
}
const allowedCategories = (lang) => new Set(new Intl.PluralRules(lang).resolvedOptions().pluralCategories);

// Every locale against the reference: same keys, the plural forms of its language, same {{variables}}
function compareLocale(lang, map, reference) {
  const file = `${lang}.json`;
  const own = shape(map);
  const ref = shape(reference);
  const required = requiredCategories(lang);
  const allowed = allowedCategories(lang);
  for (const [key, value] of ref.plain) {
    if (!own.plain.has(key)) {
      if (own.plurals.has(key)) continue; // a plain English text can be a plural in another language
      errors.push(`${file}: missing key "${key}"`);
    } else if (variables(own.plain.get(key)) !== variables(value)) {
      errors.push(`${file}: "${key}" has different {{variables}}`);
    }
  }
  for (const [base, forms] of ref.plurals) {
    const mine = own.plurals.get(base);
    if (!mine) {
      if (!own.plain.has(base)) errors.push(`${file}: missing plural key "${base}_…"`);
      else {
        // a plain text where English has plural forms: allowed (some languages don't inflect),
        // but only with the same variables
        const refAll = variables([...forms.values()].join(' ')).split(',').filter((v, i, all) => v && all.indexOf(v) === i);
        const plainVars = variables(own.plain.get(base)).split(',').filter(Boolean);
        if (plainVars.some((v) => !refAll.includes(v))) errors.push(`${file}: "${base}" uses {{variables}} the code doesn't pass`);
      }
      continue;
    }
    const refVars = variables([...forms.values()].join(' '));
    for (const category of required) {
      if (!mine.has(category)) errors.push(`${file}: "${base}" needs the plural form "_${category}"`);
    }
    for (const [category, text] of mine) {
      if (!allowed.has(category)) errors.push(`${file}: "${base}_${category}" is not a plural form of ${lang}`);
      const vars = variables(text);
      // a form may leave out {{count}} ("un documento"), never add or lose other variables
      if (vars.split(',').filter((v) => v && v !== 'count').join(',') !== refVars.split(',').filter((v) => v && v !== 'count').filter((v, i, a) => a.indexOf(v) === i).join(',')) {
        errors.push(`${file}: "${base}_${category}" has different {{variables}}`);
      }
    }
  }
  for (const key of own.plain.keys()) {
    if (!ref.plain.has(key) && !ref.plurals.has(key)) errors.push(`${file}: unknown key "${key}"`);
  }
  for (const base of own.plurals.keys()) {
    if (!ref.plurals.has(base) && !ref.plain.has(base)) errors.push(`${file}: unknown plural key "${base}_…"`);
  }
  for (const [key, value] of map) if (String(value).trim() === '') errors.push(`${file}: empty value "${key}"`);
}

compareLocale('en', en, it);
compareLocale('it', it, en);
const LOCALES = fs
  .readdirSync(I18N)
  .filter((f) => /^[a-z]{2}(-[A-Z]{2})?\.json$/.test(f))
  .map((f) => f.replace('.json', ''))
  .filter((l) => l !== 'it' && l !== 'en');
const onlyLocale = process.env.I18N_LOCALE; // I18N_LOCALE=de node scripts/check-i18n.js → one language
for (const lang of LOCALES) {
  if (onlyLocale && lang !== onlyLocale) continue;
  compareLocale(lang, flatten(readLocale(lang)), en);
}

const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];
const keyExists = (key) => it.has(key) || PLURAL_SUFFIXES.some((s) => it.has(key + s));
const prefixExists = (prefix) => [...it.keys()].some((k) => k.startsWith(prefix));

// ---- 2 and 3. Source files ----

const USER_PROPS = new Set([
  'label', 'title', 'subtitle', 'placeholder', 'accessibilityLabel', 'accessibilityHint', 'message',
  'body', 'text', 'hint', 'description', 'note', 'caption', 'emptyText', 'confirmLabel', 'headerTitle',
  'headerBackTitle', 'tabBarLabel', 'value', 'values', 'heading', 'question', 'answer', 'cta',
]);
// Short Italian words (and accents): a string with one of these is user-facing Italian text
const ITALIAN = new RegExp(
  '(?:[àèéìíòóùú])|\\b(?:' +
    [
      'il', 'lo', 'la', 'le', 'gli', 'un', 'una', 'uno', 'di', 'del', 'della', 'dei', 'delle', 'dello', 'che',
      'per', 'non', 'con', 'nel', 'nella', 'nei', 'sono', 'al', 'alla', 'ai', 'dal', 'dalla', 'tra', 'sul',
      'questo', 'questa', 'tutti', 'tutte', 'tutto', 'anche', 'oppure', 'quando', 'dove', 'ancora', 'nessun',
      'nessuna', 'annulla', 'elimina', 'salva', 'modifica', 'cerca', 'aggiungi', 'chiudi', 'conferma', 'impostazioni',
      'documento', 'documenti', 'scadenza', 'scadenze', 'preferiti', 'nuovo', 'nuova', 'categoria', 'categorie',
      'condividi', 'invia', 'indietro', 'avanti', 'oggi', 'domani', 'ieri', 'giorno', 'giorni', 'mese', 'mesi',
      'anno', 'anni', 'persona', 'persone', 'famiglia', 'tessera', 'tessere', 'scansiona', 'pagina', 'pagine',
      'promemoria', 'cestino', 'ripristina', 'impossibile', 'errore', 'riprova', 'apri', 'scegli', 'aggiunto',
      'aggiunta', 'scade', 'scaduto', 'scaduta', 'pagato', 'pagata', 'importo', 'numero', 'nome', 'note', 'tipo',
      'fatto', 'fine', 'mai', 'sempre', 'ogni', 'settimana', 'ore', 'tema', 'lingua', 'utente', 'colore', 'icona',
      'copia', 'copiato', 'stampa', 'salvati', 'salvato', 'carica', 'caricamento', 'attendi', 'menu', 'altro',
      'chiaro', 'scuro', 'automatico', 'automatica', 'retro', 'fronte', 'foto', 'importa', 'file', 'cartella',
    ].join('|') +
    ')\\b',
  'i',
);
const hasLetters = (s) => /\p{L}{2,}/u.test(s);
// Not text: identifiers, paths, ids, colors, SF Symbols ("doc.text"), sql, routes, formats
const looksCode = (s) =>
  /^[\w.\-/:#@%?=&*[\]{}()|$+^<>,;!'"`~\\]*$/.test(s) && !/\s/.test(s) && !/^[A-ZÀ-Ü][a-zà-ü]+$/.test(s);

function isIgnored(sourceFile, node) {
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
  const lines = sourceFile.text.split('\n');
  return /i18n-ignore/.test(lines[line] ?? '') || /i18n-ignore/.test(lines[line - 1] ?? '');
}

function calleeName(call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return `${ts.isIdentifier(e.expression) ? e.expression.text : '?'}.${e.name.text}`;
  return '';
}

const T_CALLS = new Set(['t', 'i18n.t', 'translate']);

function checkFile(file, reportStrings) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('i18n-ignore-file')) return;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(ROOT, file);
  const where = (node) => `${rel}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;

  const report = (node, value, why) => {
    if (!reportStrings || isIgnored(sf, node)) return;
    errors.push(`${where(node)}: hardcoded ${why}: ${JSON.stringify(value.length > 70 ? value.slice(0, 67) + '…' : value)}`);
  };

  // Strings that are not shown: imports, t() keys, types, object keys, comparisons, console…
  const skipped = (node) => {
    const p = node.parent;
    if (!p) return false;
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return true;
    if (ts.isLiteralTypeNode(p)) return true;
    if (ts.isPropertyAssignment(p) && p.name === node) return true;
    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
    if (ts.isCallExpression(p)) {
      const name = calleeName(p);
      if (T_CALLS.has(name) && p.arguments[0] === node) return true;
      if (/^console\.|^require$|^StyleSheet\./.test(name)) return true;
      if (/(?:getAllAsync|getFirstAsync|runAsync|execAsync|prepareAsync|getEachAsync)$/.test(name)) return true;
    }
    if (ts.isBinaryExpression(p) && /^(===|!==|==|!=)$/.test(p.operatorToken.getText(sf))) return true;
    if (ts.isCaseClause(p)) return true;
    if (ts.isJsxAttribute(p) && /^(testID|nativeID|key|name|symbol|style|source|pathname)$/.test(p.name.getText(sf))) return true;
    return false;
  };

  // Is this string shown to the user because of where it sits (a prop, an Alert, a JSX child)?
  const userPosition = (node) => {
    let n = node;
    // walk up through templates, conditionals, arrays, || and ??
    while (
      n.parent &&
      (ts.isTemplateSpan(n.parent) ||
        ts.isTemplateExpression(n.parent) ||
        ts.isConditionalExpression(n.parent) ||
        ts.isParenthesizedExpression(n.parent) ||
        ts.isArrayLiteralExpression(n.parent) ||
        (ts.isBinaryExpression(n.parent) && /^(\|\||\?\?|\+)$/.test(n.parent.operatorToken.getText(sf))))
    ) {
      n = n.parent;
    }
    const p = n.parent;
    if (!p) return false;
    if (ts.isJsxExpression(p)) {
      const holder = p.parent;
      if (ts.isJsxAttribute(holder)) return USER_PROPS.has(holder.name.getText(sf));
      return true; // {"text"} as a JSX child
    }
    if (ts.isJsxAttribute(p)) return USER_PROPS.has(p.name.getText(sf));
    if (ts.isPropertyAssignment(p) && p.initializer === n) return USER_PROPS.has(p.name.getText(sf));
    if (ts.isCallExpression(p)) return /^(Alert\.alert|Alert\.prompt|chooseAction|Share\.share)$/.test(calleeName(p));
    return false;
  };

  const visit = (node) => {
    // t('key') must exist
    if (ts.isCallExpression(node) && T_CALLS.has(calleeName(node))) {
      const arg = node.arguments[0];
      if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) {
        if (!keyExists(arg.text)) errors.push(`${where(arg)}: key "${arg.text}" is not in it.json`);
      } else if (arg && ts.isTemplateExpression(arg)) {
        if (!prefixExists(arg.head.text)) errors.push(`${where(arg)}: no key starts with "${arg.head.text}"`);
      }
    }

    if (ts.isJsxText(node)) {
      const value = node.text.replace(/\s+/g, ' ').trim();
      if (hasLetters(value)) report(node, value, 'JSX text');
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      const value = node.text;
      const literal = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node : node.parent;
      const owner = ts.isTemplateHead(node) ? node.parent : ts.isTemplateMiddle(node) || ts.isTemplateTail(node) ? node.parent.parent : node;
      if (hasLetters(value) && !skipped(literal) && !skipped(owner)) {
        if (ITALIAN.test(value) && !looksCode(value)) report(node, value, 'Italian string');
        else if (!looksCode(value) && userPosition(owner)) report(node, value, 'user-facing string');
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function listFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return /\.(ts|tsx)$/.test(target) && !target.endsWith('.d.ts') ? [target] : [];
  return fs
    .readdirSync(target)
    .flatMap((name) => (name === 'i18n' && target === SRC ? [] : listFiles(path.join(target, name))));
}

const targets = process.argv.slice(2).map((p) => path.resolve(ROOT, p));
const focus = new Set((targets.length ? targets : [SRC]).flatMap(listFiles));
for (const file of listFiles(SRC)) checkFile(file, focus.has(file));

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n✖ i18n: ${errors.length} problem${errors.length === 1 ? '' : 's'}`);
  process.exit(1);
}
const checked = onlyLocale ? `it, en${LOCALES.includes(onlyLocale) ? `, ${onlyLocale}` : ''}` : `${LOCALES.length + 2} languages`;
console.log(`✓ i18n: ${it.size} keys, ${checked} complete, no hardcoded strings`);
