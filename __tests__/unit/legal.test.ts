import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.1',
  nativeBuildVersion: '1000001',
}));

import { formatAppVersion, getAppVersion } from '@/lib/legal/version';
import {
  isLinkSet,
  SUPPORT_EMAIL,
  WEBSITE_URL,
  PRIVACY_POLICY_URL,
  TERMS_URL,
} from '@/lib/legal/config';
import {
  buildSupportBody,
  buildSupportMailto,
  formatDevice,
  formatSystem,
} from '@/lib/legal/support-mail';
import { formatLegalDate, parseLegalBody } from '@/lib/legal/legal-text';
import { filterLicenses, findLicense, licenseId, type LicenseData } from '@/lib/legal/licenses';
import {
  combineLicenseTexts,
  isLicenseFileName,
  normaliseAuthor,
  normaliseLicense,
  normaliseRepository,
  productionDependencyNames,
  sortEntries,
  truncateLongTexts,
} from '@/scripts/licenses-lib';
import about from '@/lib/i18n/locales/ui/about';
import legal from '@/lib/i18n/locales/ui/legal';

describe('app version', () => {
  it('shows the native version with the build number', () => {
    expect(formatAppVersion('1.0.1', '1000001', '1.0.0')).toBe('1.0.1 (1000001)');
  });
  it('falls back to the app.json version without a build number', () => {
    expect(formatAppVersion(null, '42', '1.2.0')).toBe('1.2.0');
    expect(formatAppVersion(undefined, undefined, undefined)).toBe('1.0.0');
  });
  it('omits an empty build number', () => {
    expect(formatAppVersion('2.0.0', '', '1.0.0')).toBe('2.0.0');
  });
  it('reads expo-application', () => {
    expect(getAppVersion()).toBe('1.0.1 (1000001)');
  });
});

describe('legal config', () => {
  it('hides rows for empty or non-http URLs', () => {
    expect(isLinkSet('')).toBe(false);
    expect(isLinkSet('mailto:a@b.c')).toBe(false);
    expect(isLinkSet(null)).toBe(false);
    expect(isLinkSet('https://emirkaan.be/privacy')).toBe(true);
  });
  it('has the support address and no URLs yet', () => {
    expect(SUPPORT_EMAIL).toBe('support@emirkaan.be');
    expect([WEBSITE_URL, PRIVACY_POLICY_URL, TERMS_URL].every((u) => !isLinkSet(u))).toBe(true);
  });
});

describe('support e-mail', () => {
  const labels = {
    greeting: 'Hello,',
    prompt: '(Write here.)',
    noMedical: 'No medical details, please.',
    infoHeader: 'App information:',
    appVersion: 'App version',
    system: 'System',
    device: 'Phone',
    language: 'Language',
  };
  const info = {
    appVersion: '1.0.1 (1000001)',
    system: 'Android 15',
    device: 'Google Pixel 8',
    language: 'English (en)',
  };

  it('puts the details and the medical-details line in the body', () => {
    const body = buildSupportBody(info, labels);
    expect(body).toContain('No medical details, please.');
    expect(body).toContain('App version: 1.0.1 (1000001)');
    expect(body).toContain('System: Android 15');
    expect(body).toContain('Phone: Google Pixel 8');
    expect(body).toContain('Language: English (en)');
    expect(body.startsWith('Hello,')).toBe(true);
  });

  it('builds an encoded mailto URL with CRLF line breaks', () => {
    const url = buildSupportMailto('support@emirkaan.be', {
      subject: 'MyMedSchedule support',
      body: 'a & b\nc?',
    });
    expect(url).toBe(
      'mailto:support@emirkaan.be?subject=MyMedSchedule%20support&body=a%20%26%20b%0D%0Ac%3F'
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get('body')).toBe('a & b\r\nc?');
  });

  it('formats device and system', () => {
    expect(formatDevice('Google', 'Pixel 8')).toBe('Google Pixel 8');
    expect(formatDevice('samsung', 'Samsung SM-S911B')).toBe('Samsung SM-S911B');
    expect(formatDevice(null, null)).toBe('Unknown');
    expect(formatDevice('Xiaomi', '')).toBe('Xiaomi');
    expect(formatSystem('Android', '15')).toBe('Android 15');
    expect(formatSystem(null, undefined)).toBe('Unknown');
  });
});

describe('legal text', () => {
  it('splits paragraphs and bullet lists', () => {
    expect(parseLegalBody('Intro line\nsame paragraph.\n\n• One\n• Two\n\nOutro.')).toEqual([
      { kind: 'paragraph', text: 'Intro line same paragraph.' },
      { kind: 'bullets', items: ['One', 'Two'] },
      { kind: 'paragraph', text: 'Outro.' },
    ]);
  });
  it('handles a paragraph followed directly by bullets', () => {
    expect(parseLegalBody('Lead:\n- a\n- b')).toEqual([
      { kind: 'paragraph', text: 'Lead:' },
      { kind: 'bullets', items: ['a', 'b'] },
    ]);
  });
  it('formats the effective date', () => {
    expect(formatLegalDate('2026-11-12', 'en')).toMatch(/12 November 2026|November 12, 2026/);
    expect(formatLegalDate('soon', 'en')).toBe('soon');
  });
  it('every privacy / terms section parses to something in every language', () => {
    for (const lang of ['en', 'nl', 'tr'] as const) {
      for (const doc of ['privacy', 'terms'] as const) {
        const sections = legal[lang][doc]!.sections as Record<
          string,
          { title: string; body: string }
        >;
        for (const [key, s] of Object.entries(sections)) {
          expect(s.title, `${lang}.${doc}.${key}`).toBeTruthy();
          expect(parseLegalBody(s.body).length, `${lang}.${doc}.${key}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

/** Every leaf key of `en` exists (non-empty) in `other`. */
function missingKeys(en: unknown, other: unknown, prefix = ''): string[] {
  if (typeof en === 'string') return typeof other === 'string' && other.trim() ? [] : [prefix];
  const out: string[] = [];
  for (const [k, v] of Object.entries(en as Record<string, unknown>)) {
    out.push(
      ...missingKeys(v, (other as Record<string, unknown> | undefined)?.[k], `${prefix}.${k}`)
    );
  }
  return out;
}

describe('about / legal translations', () => {
  it('are complete in Dutch and Turkish', () => {
    for (const lang of ['nl', 'tr'] as const) {
      expect(missingKeys(about.en, about[lang]), `about.${lang}`).toEqual([]);
      expect(missingKeys(legal.en, legal[lang]), `legal.${lang}`).toEqual([]);
    }
  });
  it('keep the {{placeholders}} of the English text', () => {
    const vars = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort().join(',');
    const walk = (en: unknown, other: unknown, path: string) => {
      if (typeof en === 'string') {
        expect(vars(other as string), path).toBe(vars(en));
        return;
      }
      for (const [k, v] of Object.entries(en as Record<string, unknown>)) {
        walk(v, (other as Record<string, unknown>)[k], `${path}.${k}`);
      }
    };
    for (const lang of ['nl', 'tr'] as const) {
      walk(about.en, about[lang], `about.${lang}`);
      walk(legal.en, legal[lang], `legal.${lang}`);
    }
  });
});

describe('licences', () => {
  const data: LicenseData = {
    native: [{ name: 'SQLCipher', version: '4', license: 'BSD-3-Clause', author: 'Zetetic LLC' }],
    packages: [
      { name: 'expo', version: '54.0.29', license: 'MIT' },
      { name: '@scope/pkg', version: '1.0.0', license: 'Apache-2.0', author: 'Jane Doe' },
    ],
  };

  it('finds entries by id', () => {
    const id = licenseId(data.packages[1], 'npm');
    expect(id).toBe('npm:@scope/pkg@1.0.0');
    expect(findLicense(data, id)?.license).toBe('Apache-2.0');
    expect(findLicense(data, licenseId(data.native[0], 'native'))?.name).toBe('SQLCipher');
    expect(findLicense(data, 'npm:nope@1')).toBeUndefined();
  });

  it('filters by name, licence or author, all words', () => {
    expect(filterLicenses(data.packages, '')).toHaveLength(2);
    expect(filterLicenses(data.packages, 'apache')).toHaveLength(1);
    expect(filterLicenses(data.packages, 'jane pkg')).toHaveLength(1);
    expect(filterLicenses(data.packages, 'jane mit')).toHaveLength(0);
  });

  it('ships generated data with packages and native parts', async () => {
    const json = (await import('@/lib/legal/licenses.generated.json')).default as LicenseData;
    expect(json.packages.length).toBeGreaterThan(50);
    expect(json.packages.some((p) => p.name === 'expo')).toBe(true);
    expect(json.packages.some((p) => p.name === 'vitest')).toBe(false); // devDependency
    expect(json.native.map((n) => n.name)).toContain('SQLCipher');
    expect(json.native.every((n) => !!n.licenseText)).toBe(true);
  });
});

describe('licence script helpers', () => {
  it('normalises licence fields', () => {
    expect(normaliseLicense({ license: 'MIT' })).toBe('MIT');
    expect(normaliseLicense({ license: { type: 'ISC' } })).toBe('ISC');
    expect(normaliseLicense({ licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] })).toBe(
      '(MIT OR Apache-2.0)'
    );
    expect(normaliseLicense({})).toBe('UNKNOWN');
  });

  it('keeps only author names (no e-mail addresses)', () => {
    expect(normaliseAuthor('Jane Doe <jane@example.com> (https://jane.dev)')).toBe('Jane Doe');
    expect(normaliseAuthor({ name: 'Expo', email: 'x@y.z' })).toBe('Expo');
    expect(normaliseAuthor(undefined)).toBeUndefined();
  });

  it('turns repository fields into https URLs', () => {
    expect(normaliseRepository('git+https://github.com/expo/expo.git')).toBe(
      'https://github.com/expo/expo'
    );
    expect(normaliseRepository({ type: 'git', url: 'git://github.com/a/b.git' })).toBe(
      'https://github.com/a/b'
    );
    expect(normaliseRepository('git@github.com:a/b.git')).toBe('https://github.com/a/b');
    expect(normaliseRepository('github:a/b')).toBe('https://github.com/a/b');
    expect(normaliseRepository('a/b')).toBe('https://github.com/a/b');
    expect(normaliseRepository('https://github.com/a/b.git#main')).toBe('https://github.com/a/b');
    expect(normaliseRepository('')).toBeUndefined();
  });

  it('recognises licence file names', () => {
    for (const n of [
      'LICENSE',
      'license.md',
      'LICENCE.txt',
      'COPYING',
      'LICENSE-MIT',
      'LICENSE_FONT',
    ])
      expect(isLicenseFileName(n), n).toBe(true);
    for (const n of ['license.js', 'licenses', 'README.md', 'package.json'])
      expect(isLicenseFileName(n), n).toBe(false);
  });

  it('combines and de-duplicates licence texts', () => {
    expect(
      combineLicenseTexts([
        { name: 'LICENSE_FONT', text: 'OFL\r\n' },
        { name: 'LICENSE', text: 'MIT' },
        { name: 'LICENSE.md', text: 'MIT' },
      ])
    ).toBe('MIT\n\n---\n\nOFL');
    expect(combineLicenseTexts([])).toBeUndefined();
  });

  it('lists production dependencies only', () => {
    expect(
      productionDependencyNames({
        dependencies: { a: '1' },
        optionalDependencies: { b: '1', a: '1' },
        // @ts-expect-error devDependencies are not part of the type on purpose
        devDependencies: { c: '1' },
      })
    ).toEqual(['a', 'b']);
  });

  it('sorts and truncates', () => {
    const entries = sortEntries([
      { name: 'b', version: '1', license: 'MIT', licenseText: 'x'.repeat(50) },
      { name: 'A', version: '1', license: 'MIT', repository: 'https://r' },
    ]);
    expect(entries.map((e) => e.name)).toEqual(['A', 'b']);
    expect(truncateLongTexts(entries, 10)).toBe(1);
    expect(entries[1].licenseText!.startsWith('xxxxxxxxxx\n\n[…] Shortened.')).toBe(true);
  });
});
