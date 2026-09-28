/** Small deterministic string hash (djb2), used for tint selection. */
export function hashString(input: string): number {
  let h = 5381;
  const s = input.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
