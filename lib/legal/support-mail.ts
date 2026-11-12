/**
 * The "Contact support" e-mail: a mailto: URL with the subject and a body that already holds the
 * app version, Android version, phone model and language. Pure (no native modules) for tests.
 *
 * @example
 * buildSupportMailto('support@emirkaan.be', { subject: 'MyMedSchedule support', body })
 */
export interface SupportInfo {
  appVersion: string;
  /** "Android 15" */
  system: string;
  /** "Google Pixel 8" */
  device: string;
  /** "English (en)" */
  language: string;
}

export interface SupportMailLabels {
  greeting: string;
  prompt: string;
  noMedical: string;
  infoHeader: string;
  appVersion: string;
  system: string;
  device: string;
  language: string;
}

export function buildSupportBody(info: SupportInfo, labels: SupportMailLabels): string {
  return [
    labels.greeting,
    '',
    labels.prompt,
    '',
    '',
    labels.noMedical,
    '',
    '—',
    labels.infoHeader,
    `${labels.appVersion}: ${info.appVersion}`,
    `${labels.system}: ${info.system}`,
    `${labels.device}: ${info.device}`,
    `${labels.language}: ${info.language}`,
  ].join('\n');
}

/** RFC 6068 mailto: the address stays readable, subject and body are percent-encoded (CRLF). */
export function buildSupportMailto(
  email: string,
  { subject, body }: { subject: string; body: string }
): string {
  const enc = (s: string) => encodeURIComponent(s.replace(/\r?\n/g, '\r\n'));
  return `mailto:${email}?subject=${enc(subject)}&body=${enc(body)}`;
}

/** "Google" + "Pixel 8" → "Google Pixel 8" (no doubled brand: "Samsung" + "Samsung SM-…"). */
export function formatDevice(
  brand: string | null | undefined,
  model: string | null | undefined
): string {
  const b = brand?.trim() ?? '';
  const m = model?.trim() ?? '';
  if (!m) return b || 'Unknown';
  if (!b || m.toLowerCase().startsWith(b.toLowerCase())) return m;
  return `${b} ${m}`;
}

/** "Android" + "15" → "Android 15". */
export function formatSystem(
  osName: string | null | undefined,
  osVersion: string | null | undefined
): string {
  return [osName?.trim(), osVersion?.trim()].filter(Boolean).join(' ') || 'Unknown';
}
