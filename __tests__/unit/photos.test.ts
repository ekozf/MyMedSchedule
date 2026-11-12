import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from '../helpers/fake-file-system';

vi.mock('expo-file-system', async () => (await import('../helpers/fake-file-system')).module);

import {
  deleteAllPhotos,
  deletePhotoIfManaged,
  isManagedPhotoUri,
  keepPickedPhoto,
  persistPhoto,
  pruneOrphanPhotos,
} from '@/lib/media/photos';

const PICKED = 'file:///data/app/cache/ImagePicker/abc.jpg';

beforeEach(() => {
  fs.reset();
  fs.dirs.add('file:///data/app/cache/ImagePicker/');
  fs.files.add(PICKED);
});

describe('photos', () => {
  it('copies a picked photo into <documents>/photos and drops the cache copy', async () => {
    const uri = await persistPhoto(PICKED);
    expect(uri).toMatch(/^file:\/\/\/data\/app\/files\/photos\/[0-9a-f-]{36}\.jpg$/);
    expect(fs.files.has(uri)).toBe(true);
    expect(fs.files.has(PICKED)).toBe(false);
    expect(isManagedPhotoUri(uri)).toBe(true);
    expect(await persistPhoto(uri)).toBe(uri); // already ours
  });

  it('keepPickedPhoto falls back to the original URI when copying fails', async () => {
    expect(await keepPickedPhoto('file:///nowhere/x.jpg')).toBe('file:///nowhere/x.jpg');
  });

  it('only ever deletes files inside the photos folder', async () => {
    const uri = await persistPhoto(PICKED);
    const other = 'file:///data/app/files/other.jpg';
    fs.files.add(other);
    deletePhotoIfManaged(other);
    deletePhotoIfManaged('file:///data/app/files/photos/../other.jpg');
    deletePhotoIfManaged('file:///data/app/files/photos/sub/x.jpg');
    deletePhotoIfManaged(null);
    expect(fs.files.has(other)).toBe(true);
    deletePhotoIfManaged(uri);
    expect(fs.files.has(uri)).toBe(false);
  });

  it('prunes photos no record refers to', async () => {
    fs.files.add(PICKED.replace('abc', 'def'));
    const kept = await persistPhoto(PICKED);
    const orphan = await persistPhoto(PICKED.replace('abc', 'def'));
    expect(pruneOrphanPhotos([kept, null, 'file:///elsewhere.jpg'])).toBe(1);
    expect(fs.files.has(kept)).toBe(true);
    expect(fs.files.has(orphan)).toBe(false);
  });

  it('deleteAllPhotos removes the folder', async () => {
    const uri = await persistPhoto(PICKED);
    deleteAllPhotos();
    expect(fs.files.has(uri)).toBe(false);
    expect(() => deleteAllPhotos()).not.toThrow();
  });
});
