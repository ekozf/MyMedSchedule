/**
 * Pure helpers for scripts/generate-licenses.ts (kept separate so tests can import them without
 * running the generator). No Node APIs here.
 */

export interface PackageJsonLike {
  name?: string;
  version?: string;
  license?: unknown;
  licenses?: unknown;
  author?: unknown;
  repository?: unknown;
  homepage?: unknown;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  author?: string;
  repository?: string;
  licenseText?: string;
}

/** SPDX-ish license string from `license` (string or `{ type }`) or the old `licenses` array. */
export function normaliseLicense(pkg: Pick<PackageJsonLike, 'license' | 'licenses'>): string {
  const one = (value: unknown): string | null => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object' && 'type' in value) {
      const type = (value as { type?: unknown }).type;
      if (typeof type === 'string' && type.trim()) return type.trim();
    }
    return null;
  };
  const direct = one(pkg.license);
  if (direct) return direct;
  if (Array.isArray(pkg.licenses)) {
    const all = pkg.licenses.map(one).filter((v): v is string => !!v);
    if (all.length === 1) return all[0];
    if (all.length > 1) return `(${all.join(' OR ')})`;
  }
  return 'UNKNOWN';
}

/** "Name <mail> (url)" or `{ name }` → the name only (no e-mail addresses in the app). */
export function normaliseAuthor(author: unknown): string | undefined {
  let raw: string | undefined;
  if (typeof author === 'string') raw = author;
  else if (author && typeof author === 'object' && 'name' in author) {
    const name = (author as { name?: unknown }).name;
    if (typeof name === 'string') raw = name;
  }
  if (!raw) return undefined;
  const name = raw
    .replace(/<[^>]*>/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return name || undefined;
}

/**
 * Repository as a browsable https URL: handles `git+https://…git`, `git://`, `git@github.com:a/b`,
 * `github:a/b`, the `a/b` shorthand and `{ url }`.
 */
export function normaliseRepository(repository: unknown): string | undefined {
  let raw: string | undefined;
  if (typeof repository === 'string') raw = repository;
  else if (repository && typeof repository === 'object' && 'url' in repository) {
    const url = (repository as { url?: unknown }).url;
    if (typeof url === 'string') raw = url;
  }
  if (!raw) return undefined;
  let url = raw.trim();
  if (!url) return undefined;
  const shorthand = /^(github|gitlab|bitbucket):(.+)$/.exec(url);
  if (shorthand) {
    const host = { github: 'github.com', gitlab: 'gitlab.com', bitbucket: 'bitbucket.org' }[
      shorthand[1] as 'github' | 'gitlab' | 'bitbucket'
    ];
    url = `https://${host}/${shorthand[2]}`;
  } else if (/^[\w.-]+\/[\w.-]+$/.test(url)) {
    url = `https://github.com/${url}`;
  }
  url = url
    .replace(/^git\+/, '')
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/^ssh:\/\/git@/, 'https://')
    .replace(/^git:\/\//, 'https://')
    .replace(/^http:\/\//, 'https://')
    .replace(/\.git(#.*)?$/, '')
    .replace(/#.*$/, '');
  return /^https:\/\//.test(url) ? url : undefined;
}

/** LICENSE, LICENCE, COPYING, LICENSE.md, LICENSE-MIT, LICENSE_FONT, … (not license.js etc.). */
export function isLicenseFileName(fileName: string): boolean {
  return /^(licen[cs]e|copying)([-_][\w-]+|\.(mit|apache2?|bsd|isc))?(\.(md|txt|markdown|rst))?$/i.test(
    fileName
  );
}

/** Combines a package's license files (sorted by name) into one text, normalised line endings. */
export function combineLicenseTexts(files: { name: string; text: string }[]): string | undefined {
  const texts = [...files]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => f.text.replace(/\r\n?/g, '\n').trim())
    .filter(Boolean);
  const unique = texts.filter((t, i) => texts.indexOf(t) === i);
  return unique.length ? unique.join('\n\n---\n\n') : undefined;
}

/** Production dependency names of a package.json (dependencies + optionalDependencies). */
export function productionDependencyNames(pkg: PackageJsonLike): string[] {
  return [
    ...new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.optionalDependencies ?? {}),
    ]),
  ];
}

export function entryKey(name: string, version: string): string {
  return `${name}@${version}`;
}

/** Sorts entries by name (case-insensitive), then version. */
export function sortEntries<T extends { name: string; version: string }>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.version.localeCompare(b.version)
  );
}

/**
 * Shortens license texts longer than `maxChars`, keeping the start, with a pointer to the
 * repository. Returns the number of texts shortened.
 */
export function truncateLongTexts(entries: LicenseEntry[], maxChars: number): number {
  let n = 0;
  for (const e of entries) {
    if (e.licenseText && e.licenseText.length > maxChars) {
      e.licenseText =
        e.licenseText.slice(0, maxChars).trimEnd() +
        `\n\n[…] Shortened. Full text: ${e.repository ?? `the ${e.name} package`}.`;
      n += 1;
    }
  }
  return n;
}
