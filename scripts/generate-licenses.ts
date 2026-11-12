/**
 * Writes lib/legal/licenses.generated.json: the open-source licences shown in Settings › About ›
 * Open-source licences.
 *
 * - `packages`: every production npm dependency, found by walking `dependencies` (and installed
 *   `optionalDependencies`) from package.json through node_modules with Node's resolution rules,
 *   de-duplicated by name@version. devDependencies are skipped.
 * - `native`: native parts that npm metadata doesn't describe (SQLCipher, OpenSSL, Hermes,
 *   AndroidX, Google Play services / Firebase pulled in by expo-notifications, the font). Their
 *   texts are read from files in node_modules where possible.
 *
 * Run after changing dependencies: `bun run licenses`.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  combineLicenseTexts,
  entryKey,
  isLicenseFileName,
  normaliseAuthor,
  normaliseLicense,
  normaliseRepository,
  productionDependencyNames,
  sortEntries,
  truncateLongTexts,
  type LicenseEntry,
  type PackageJsonLike,
} from './licenses-lib';

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'lib/legal/licenses.generated.json');
/** Above this size, very long licence texts are shortened. */
const MAX_BYTES = 2 * 1024 * 1024;
const LONG_TEXT_CHARS = 12_000;

function readJson(file: string): PackageJsonLike | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as PackageJsonLike;
  } catch {
    return null;
  }
}

/** Node resolution: `<dir>/node_modules/<name>`, walking up to the project root. */
function resolvePackageDir(name: string, fromDir: string): string | null {
  let dir = fromDir;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return fs.realpathSync(candidate);
    if (dir === ROOT || dir === path.dirname(dir)) return null;
    dir = path.dirname(dir);
  }
}

function readLicenseText(dir: string): string | undefined {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter(isLicenseFileName);
  } catch {
    return undefined;
  }
  const files = names
    .map((name) => {
      const file = path.join(dir, name);
      try {
        return fs.statSync(file).isFile() ? { name, text: fs.readFileSync(file, 'utf8') } : null;
      } catch {
        return null;
      }
    })
    .filter((f): f is { name: string; text: string } => !!f);
  return combineLicenseTexts(files);
}

function collectPackages(): { entries: LicenseEntry[]; missing: string[] } {
  const rootPkg = readJson(path.join(ROOT, 'package.json'));
  if (!rootPkg) throw new Error('package.json not found');
  const seen = new Map<string, LicenseEntry>();
  const visitedDirs = new Set<string>();
  const missing = new Set<string>();
  const queue: { name: string; from: string; optional: boolean }[] = [
    ...Object.keys(rootPkg.dependencies ?? {}).map((name) => ({
      name,
      from: ROOT,
      optional: false,
    })),
  ];

  while (queue.length) {
    const { name, from, optional } = queue.shift()!;
    const dir = resolvePackageDir(name, from);
    if (!dir) {
      if (!optional) missing.add(name);
      continue;
    }
    if (visitedDirs.has(dir)) continue;
    visitedDirs.add(dir);
    const pkg = readJson(path.join(dir, 'package.json'));
    if (!pkg?.name || !pkg.version) continue;

    const key = entryKey(pkg.name, pkg.version);
    if (!seen.has(key)) {
      seen.set(key, {
        name: pkg.name,
        version: pkg.version,
        license: normaliseLicense(pkg),
        author: normaliseAuthor(pkg.author),
        repository: normaliseRepository(pkg.repository),
        licenseText: readLicenseText(dir),
      });
    }
    const optionalNames = new Set(Object.keys(pkg.optionalDependencies ?? {}));
    for (const dep of productionDependencyNames(pkg)) {
      queue.push({ name: dep, from: dir, optional: optionalNames.has(dep) });
    }
  }
  return { entries: sortEntries([...seen.values()]), missing: [...missing].sort() };
}

// -----------------------------------------------------------------------------
// Native components (not in npm metadata)
// -----------------------------------------------------------------------------

function readFileOrNull(file: string): string | null {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/** The full Apache-2.0 text, taken from any package in node_modules that ships it. */
function findApacheText(): string | undefined {
  const nm = path.join(ROOT, 'node_modules');
  const dirs: string[] = [];
  for (const entry of fs.readdirSync(nm)) {
    if (entry.startsWith('.')) continue;
    if (entry.startsWith('@')) {
      for (const sub of fs.readdirSync(path.join(nm, entry))) dirs.push(path.join(nm, entry, sub));
    } else dirs.push(path.join(nm, entry));
  }
  for (const dir of dirs) {
    const text = readFileOrNull(path.join(dir, 'LICENSE'));
    if (!text) continue;
    const start = text.indexOf('Apache License');
    const end = text.indexOf('END OF TERMS AND CONDITIONS');
    if (start >= 0 && end > start && text.includes('Version 2.0, January 2004')) {
      return text.slice(start, end + 'END OF TERMS AND CONDITIONS'.length).trim();
    }
  }
  return undefined;
}

/** SQLCipher's BSD-style notice, from the amalgamation expo-sqlite compiles. */
function findSqlcipherText(): string | undefined {
  const src = readFileOrNull(
    path.join(ROOT, 'node_modules/expo-sqlite/vendor/sqlcipher/sqlite3.c')
  );
  if (!src) return undefined;
  const m = /Copyright \(c\) 2008-\d{4}, ZETETIC LLC[\s\S]*?SUCH DAMAGE\./.exec(src);
  if (!m) return undefined;
  return m[0]
    .split('\n')
    .map((line) => line.replace(/^\*\*\s?/, ''))
    .join('\n')
    .trim();
}

function nativeEntries(): LicenseEntry[] {
  const apache = findApacheText();
  const mitMeta = readFileOrNull(path.join(ROOT, 'node_modules/react-native/LICENSE'))?.trim();
  const font = readFileOrNull(
    path.join(ROOT, 'node_modules/@expo-google-fonts/atkinson-hyperlegible-next/LICENSE_FONT')
  )?.trim();
  const sqlcipher = findSqlcipherText();
  const entries: LicenseEntry[] = [
    {
      name: 'SQLCipher',
      version: '4',
      license: 'BSD-3-Clause',
      author: 'Zetetic LLC',
      repository: 'https://github.com/sqlcipher/sqlcipher',
      licenseText: sqlcipher,
    },
    {
      name: 'SQLite',
      version: '3',
      license: 'Public domain',
      repository: 'https://www.sqlite.org/copyright.html',
      licenseText:
        'The SQLite source code is in the public domain. See https://www.sqlite.org/copyright.html',
    },
    {
      name: 'OpenSSL (used by SQLCipher)',
      version: '3',
      license: 'Apache-2.0',
      author: 'The OpenSSL Project Authors',
      repository: 'https://github.com/openssl/openssl',
      licenseText: apache,
    },
    {
      name: 'React Native',
      version: '0.81',
      license: 'MIT',
      author: 'Meta Platforms, Inc. and affiliates',
      repository: 'https://github.com/facebook/react-native',
      licenseText: mitMeta,
    },
    {
      name: 'Hermes JavaScript engine',
      version: '0.81',
      license: 'MIT',
      author: 'Meta Platforms, Inc. and affiliates',
      repository: 'https://github.com/facebook/hermes',
      licenseText: mitMeta,
    },
    {
      name: 'AndroidX (Android Jetpack) libraries',
      version: '',
      license: 'Apache-2.0',
      author: 'The Android Open Source Project',
      repository: 'https://developer.android.com/jetpack/androidx',
      licenseText: apache,
    },
    {
      name: 'Google Play services and Firebase components (used by expo-notifications)',
      version: '',
      license: 'Apache-2.0',
      author: 'Google LLC',
      repository: 'https://github.com/firebase/firebase-android-sdk',
      licenseText: apache,
    },
    {
      name: 'Atkinson Hyperlegible Next (font)',
      version: '',
      license: 'OFL-1.1',
      author: 'The Atkinson Hyperlegible Next Project Authors',
      repository: 'https://github.com/googlefonts/atkinson-hyperlegible-next',
      licenseText: font,
    },
  ];
  for (const e of entries) {
    if (!e.licenseText) console.warn(`! No licence text found for ${e.name}`);
  }
  return entries;
}

function main() {
  const { entries, missing } = collectPackages();
  const native = nativeEntries();
  const build = () =>
    JSON.stringify({ packages: entries, native }, (_k, v) => (v === undefined ? undefined : v));

  let json = build();
  let shortened = 0;
  if (Buffer.byteLength(json) > MAX_BYTES) {
    shortened = truncateLongTexts(entries, LONG_TEXT_CHARS);
    json = build();
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json + '\n');

  const withoutText = entries.filter((e) => !e.licenseText).length;
  const unknown = entries
    .filter((e) => e.license === 'UNKNOWN')
    .map((e) => entryKey(e.name, e.version));
  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
  console.log(`  ${entries.length} npm packages, ${native.length} native components`);
  console.log(`  ${(Buffer.byteLength(json) / 1024).toFixed(0)} KB`);
  console.log(`  ${withoutText} packages without a licence file`);
  if (shortened) console.log(`  ${shortened} long licence texts shortened`);
  if (unknown.length) console.log(`  Unknown licence: ${unknown.join(', ')}`);
  if (missing.length) console.log(`  Not installed: ${missing.join(', ')}`);
}

main();
