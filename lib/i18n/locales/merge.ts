function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null) return false;
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  return true;
}

export function mergeLocale<TBase extends Record<string, unknown>, TOverride extends Record<string, unknown>>(
  base: TBase,
  override: TOverride
) {
  const out: Record<string, unknown> = { ...base };

  for (const key of Object.keys(override)) {
    const baseValue = (base as any)[key];
    const overrideValue = (override as any)[key];

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      out[key] = mergeLocale(baseValue as Record<string, unknown>, overrideValue as Record<string, unknown>);
      continue;
    }

    out[key] = overrideValue;
  }

  return out as TBase & TOverride;
}

