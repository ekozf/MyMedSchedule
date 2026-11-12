/**
 * Medicine and profile photos live in the app's private documents folder
 * (`<documents>/photos/<uuid>.jpg`), not in the image picker's cache, which the OS may clear.
 * Only files inside that folder are ever deleted by this module.
 *
 * @example
 * const uri = await persistPhoto(result.assets[0].uri); // copy out of the picker cache
 * deletePhotoIfManaged(oldUri);                          // after replacing / removing it
 */
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

export const PHOTOS_DIR_NAME = 'photos';

export function getPhotosDirectory(): Directory {
  return new Directory(Paths.document, PHOTOS_DIR_NAME);
}

function photosDirUri(): string | null {
  try {
    const uri = getPhotosDirectory().uri;
    return uri.endsWith('/') ? uri : `${uri}/`;
  } catch {
    return null;
  }
}

/** True for a file URI directly inside our photos folder (no `..` tricks). */
export function isManagedPhotoUri(uri: string | null | undefined): boolean {
  if (!uri || typeof uri !== 'string') return false;
  if (!uri.includes(`/${PHOTOS_DIR_NAME}/`) || uri.includes('..')) return false;
  const dir = photosDirUri();
  if (!dir || !uri.startsWith(dir)) return false;
  const rest = uri.slice(dir.length);
  return rest.length > 0 && !rest.includes('/');
}

function extensionOf(uri: string): string {
  const match = /\.([a-z0-9]{2,5})(?:\?|#|$)/i.exec(uri);
  const ext = match?.[1]?.toLowerCase();
  return ext && ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(ext) ? ext : 'jpg';
}

/**
 * Copies a picked / captured image into the photos folder and returns the new URI. Already
 * managed URIs are returned unchanged.
 */
export async function persistPhoto(sourceUri: string): Promise<string> {
  if (isManagedPhotoUri(sourceUri)) return sourceUri;
  const dir = getPhotosDirectory();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const target = new File(dir, `${Crypto.randomUUID()}.${extensionOf(sourceUri)}`);
  const source = new File(sourceUri);
  source.copy(target);
  // The picker's temporary copy (in our cache) is no longer needed.
  try {
    if (sourceUri.startsWith(Paths.cache.uri) && source.exists) source.delete();
  } catch {
    // the OS clears the cache eventually
  }
  return target.uri;
}

/**
 * `persistPhoto`, falling back to the original URI if the copy fails (the photo then still shows
 * until the OS clears the picker cache, as before).
 */
export async function keepPickedPhoto(sourceUri: string): Promise<string> {
  try {
    return await persistPhoto(sourceUri);
  } catch (error) {
    console.warn('Could not copy photo into app storage:', error);
    return sourceUri;
  }
}

/** Deletes the file when it is one of our photos; anything else is left alone. Never throws. */
export function deletePhotoIfManaged(uri: string | null | undefined): void {
  if (!uri || !isManagedPhotoUri(uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Could not delete photo:', error);
  }
}

/** Deletes the whole photos folder ("Delete all data"). Never throws. */
export function deleteAllPhotos(): void {
  try {
    const dir = getPhotosDirectory();
    if (dir.exists) dir.delete();
  } catch (error) {
    console.warn('Could not delete the photos folder:', error);
  }
}

/**
 * Removes photos no record points at any more (a photo picked in a form that was then cancelled).
 * `referenced` are the URIs still stored in the database. Call only at app start, before any form
 * could be holding a freshly picked (not yet saved) photo. Never throws.
 */
export function pruneOrphanPhotos(referenced: Iterable<string | null | undefined>): number {
  let removed = 0;
  try {
    const dir = getPhotosDirectory();
    if (!dir.exists) return 0;
    // Compare file names: URIs of the same file can differ in form (file:/ vs file:///).
    const keep = new Set<string>();
    for (const uri of referenced) {
      if (uri && uri.includes(`/${PHOTOS_DIR_NAME}/`)) keep.add(uri.slice(uri.lastIndexOf('/') + 1));
    }
    for (const entry of dir.list()) {
      if (entry instanceof File && !keep.has(entry.name)) {
        try {
          entry.delete();
          removed += 1;
        } catch {
          // try again next start
        }
      }
    }
  } catch (error) {
    console.warn('Could not tidy up photos:', error);
  }
  return removed;
}
