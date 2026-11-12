/**
 * Tiny in-memory stand-in for expo-file-system's `Paths` / `File` / `Directory` (the new API).
 * Use: vi.mock('expo-file-system', async () => (await import('../helpers/fake-file-system')).module);
 */
export const files = new Set<string>();
export const dirs = new Set<string>();

const DOC = 'file:///data/app/files/';
const CACHE = 'file:///data/app/cache/';

function join(parts: any[]): string {
  let out = '';
  for (const p of parts) {
    const s = typeof p === 'string' ? p : p.uri;
    out = out ? `${out.replace(/\/$/, '')}/${s.replace(/^\//, '')}` : s;
  }
  return out;
}

class FakeFile {
  uri: string;
  constructor(...parts: any[]) {
    this.uri = join(parts);
  }
  get name() {
    return this.uri.slice(this.uri.lastIndexOf('/') + 1);
  }
  get exists() {
    return files.has(this.uri);
  }
  copy(dest: FakeFile) {
    if (!files.has(this.uri)) throw new Error(`missing ${this.uri}`);
    files.add(dest.uri);
  }
  delete() {
    if (!files.delete(this.uri)) throw new Error(`missing ${this.uri}`);
  }
}

class FakeDirectory {
  uri: string;
  constructor(...parts: any[]) {
    this.uri = join(parts).replace(/\/?$/, '/');
  }
  get name() {
    const u = this.uri.replace(/\/$/, '');
    return u.slice(u.lastIndexOf('/') + 1);
  }
  get exists() {
    return dirs.has(this.uri);
  }
  create() {
    dirs.add(this.uri);
  }
  delete() {
    if (!dirs.has(this.uri)) throw new Error('missing dir');
    for (const f of [...files]) if (f.startsWith(this.uri)) files.delete(f);
    for (const d of [...dirs]) if (d.startsWith(this.uri)) dirs.delete(d);
  }
  list() {
    const out: (FakeFile | FakeDirectory)[] = [];
    for (const f of files) {
      const rest = f.slice(this.uri.length);
      if (f.startsWith(this.uri) && rest && !rest.includes('/')) out.push(new FakeFile(f));
    }
    for (const d of dirs) {
      const rest = d.slice(this.uri.length).replace(/\/$/, '');
      if (d.startsWith(this.uri) && rest && !rest.includes('/')) out.push(new FakeDirectory(d));
    }
    return out;
  }
}

export function reset() {
  files.clear();
  dirs.clear();
  dirs.add(DOC);
  dirs.add(CACHE);
}

export const module = {
  File: FakeFile,
  Directory: FakeDirectory,
  Paths: {
    get document() {
      return new FakeDirectory(DOC);
    },
    get cache() {
      return new FakeDirectory(CACHE);
    },
  },
};
