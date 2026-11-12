import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const DB_NAME = 'mymedschedule.db';
export const DB_KEY_NAME = 'db_encryption_key';

/**
 * SQLCipher passphrase format. New keys are 64 hex chars (32 random bytes from the platform CSPRNG);
 * keys from older versions are also 64 hex chars (but came from Math.random) and stay untouched,
 * since replacing a key would lock the existing database. See `pragmaKeyStatement`.
 */
const DB_KEY_PATTERN = /^[0-9a-f]{32,128}$/i;

export function isValidDatabaseKey(key: string | null | undefined): boolean {
  return typeof key === 'string' && DB_KEY_PATTERN.test(key);
}

/** 32 bytes from the platform CSPRNG, hex encoded. */
export function generateDatabaseKey(): string {
  const bytes = Crypto.getRandomBytes(32);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

// Generate or retrieve encryption key
async function getOrCreateDatabaseKey(): Promise<string> {
  const stored = await SecureStore.getItemAsync(DB_KEY_NAME);

  if (stored) {
    if (!isValidDatabaseKey(stored)) {
      // Not expected (every version wrote hex), but replacing the key would make the existing
      // database unreadable, so keep it — `pragmaKeyStatement` quotes it safely.
      console.warn('Database key is not hex; using it as-is.');
    }
    return stored;
  }

  const key = generateDatabaseKey();
  await SecureStore.setItemAsync(DB_KEY_NAME, key);
  return key;
}

/**
 * `PRAGMA key` can't take bound parameters, so the key is interpolated: hex keys go in as-is,
 * anything else has its single quotes doubled (SQL string literal escaping) and NULs removed.
 */
export function pragmaKeyStatement(key: string): string {
  const safe = isValidDatabaseKey(key) ? key : key.replace(/\0/g, '').replace(/'/g, "''");
  return `PRAGMA key = '${safe}';`;
}

let dbInstance: ReturnType<typeof drizzle> | null = null;
let rawDb: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<ReturnType<typeof drizzle>> | null = null;

/**
 * Opens (and creates / migrates) the encrypted database. Concurrent callers share one open.
 * After `closeDatabase()` it opens again, creating a fresh key + file if they were deleted.
 */
export function initDatabase() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (!initPromise) {
    initPromise = openDatabase().finally(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

/** Closes the database (if open) so its file can be deleted. `getDatabase()` throws until the next `initDatabase()`. */
export function closeDatabase(): void {
  const db = rawDb;
  dbInstance = null;
  rawDb = null;
  if (db) {
    try {
      db.closeSync();
    } catch (error) {
      console.warn('Could not close the database:', error);
    }
  }
}

/**
 * Closes the database and deletes its file plus SQLite's side files (-wal, -shm, -journal).
 * The key in SecureStore is left alone (the caller decides). Errors for files that don't exist are
 * ignored.
 */
export function deleteDatabaseFiles(): void {
  closeDatabase();
  try {
    SQLite.deleteDatabaseSync(DB_NAME);
  } catch (error) {
    // Missing file is fine; anything else is retried below by deleting the file directly.
    console.warn('deleteDatabaseSync:', error);
  }
  const dir: string | undefined = (SQLite as any).defaultDatabaseDirectory;
  if (!dir) return;
  const base = dir.startsWith('file://') ? dir : `file://${dir}`;
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try {
      const file = new File(`${base}/${DB_NAME}${suffix}`);
      if (file.exists) file.delete();
    } catch (error) {
      console.warn(`Could not delete ${DB_NAME}${suffix}:`, error);
    }
  }
}

async function openDatabase() {
  const key = await getOrCreateDatabaseKey();
  const db = SQLite.openDatabaseSync(DB_NAME);

  // Set encryption key for SQLCipher.
  db.execSync(pragmaKeyStatement(key));

  // Create tables if they don't exist
  db.execSync(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_uri TEXT,
      settings TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      strength TEXT,
      image_uri TEXT,
      notes TEXT,
      dosage_amount REAL NOT NULL,
      dosage_unit TEXT NOT NULL,
      schedule_type TEXT NOT NULL,
      schedule_config TEXT NOT NULL,
      inventory_count REAL DEFAULT 0,
      track_supply INTEGER DEFAULT 1,
      package_size REAL,
      max_daily_dose REAL,
      min_hours_between_doses REAL,
      expiration_date TEXT,
      refill_reminder_type TEXT,
      refill_reminder_value INTEGER,
      bypass_dnd INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      is_prn INTEGER DEFAULT 0,
      schedule_start_date TEXT,
      schedule_start_exact INTEGER DEFAULT 0,
      next_dose_override_time TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    -- Migration: Add new columns if they don't exist (for existing databases)
    -- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a try-catch approach
    -- by attempting to add the columns and ignoring errors if they already exist
    -- Note: This will fail silently if columns already exist, which is acceptable
    -- In production, you might want to check column existence first using PRAGMA table_info
    -- For now, we'll add them unconditionally - SQLite will error if they exist, but we can ignore
    -- Actually, let's check if we can query the table info first
    
    CREATE TABLE IF NOT EXISTS intake_logs (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      scheduled_time TEXT,
      actual_time TEXT NOT NULL,
      action TEXT NOT NULL,
      dosage_amount REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      adjustment_type TEXT NOT NULL,
      amount REAL NOT NULL,
      previous_count REAL NOT NULL,
      new_count REAL NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS disclaimer_acknowledgments (
      id TEXT PRIMARY KEY,
      profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
      version TEXT NOT NULL,
      acknowledged_at TEXT NOT NULL,
      device_info TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_medications_profile ON medications(profile_id);
    CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(is_active);
    CREATE INDEX IF NOT EXISTS idx_intake_logs_medication ON intake_logs(medication_id);
    CREATE INDEX IF NOT EXISTS idx_intake_logs_profile ON intake_logs(profile_id);
    CREATE INDEX IF NOT EXISTS idx_intake_logs_time ON intake_logs(actual_time);
    CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_medication
      ON inventory_adjustments(medication_id, created_at);
  `);

  // Migration: Add new columns if they don't exist (for existing databases)
  // SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we check column existence first
  try {
    const tableInfo = db.getAllSync<{ name: string }>('PRAGMA table_info(medications)');
    const columns = tableInfo.map((row) => row.name);

    if (!columns.includes('schedule_start_date')) {
      db.execSync(`ALTER TABLE medications ADD COLUMN schedule_start_date TEXT`);
    }
    if (!columns.includes('schedule_start_exact')) {
      db.execSync(`ALTER TABLE medications ADD COLUMN schedule_start_exact INTEGER DEFAULT 0`);
    }
    if (!columns.includes('next_dose_override_time')) {
      db.execSync(`ALTER TABLE medications ADD COLUMN next_dose_override_time TEXT`);
    }
    if (!columns.includes('strength')) {
      db.execSync(`ALTER TABLE medications ADD COLUMN strength TEXT`);
    }
    if (!columns.includes('track_supply')) {
      // Existing medicines keep tracking (the old behaviour); the editor turns it off.
      db.execSync(`ALTER TABLE medications ADD COLUMN track_supply INTEGER DEFAULT 1`);
    }
    const adjustmentInfo = db.getAllSync<{ name: string }>(
      'PRAGMA table_info(inventory_adjustments)'
    );
    const adjustmentColumns = adjustmentInfo.map((row) => row.name);
    if (adjustmentColumns.length && !adjustmentColumns.includes('reason')) {
      db.execSync(`ALTER TABLE inventory_adjustments ADD COLUMN reason TEXT`);
    }
  } catch (error) {
    // If migration fails, columns might already exist or table doesn't exist yet - that's okay
    // The CREATE TABLE IF NOT EXISTS above will handle new tables
    console.warn('Migration check completed (errors are normal for new databases):', error);
  }

  rawDb = db;
  dbInstance = drizzle(db, { schema });

  return dbInstance;
}

export function getDatabase() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}
