import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const DB_NAME = 'mymedschedule.db';
const DB_KEY_NAME = 'db_encryption_key';

// Generate or retrieve encryption key
async function getOrCreateDatabaseKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(DB_KEY_NAME);

  if (!key) {
    // Generate random key
    key = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, '0')
    ).join('');

    await SecureStore.setItemAsync(DB_KEY_NAME, key);
  }

  return key;
}

let dbInstance: ReturnType<typeof drizzle> | null = null;

export async function initDatabase() {
  if (dbInstance) return dbInstance;

  const key = await getOrCreateDatabaseKey();
  const db = SQLite.openDatabaseSync(DB_NAME);

  // Set encryption key for SQLCipher
  db.execSync(`PRAGMA key = '${key}';`);

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
      image_uri TEXT,
      notes TEXT,
      dosage_amount REAL NOT NULL,
      dosage_unit TEXT NOT NULL,
      schedule_type TEXT NOT NULL,
      schedule_config TEXT NOT NULL,
      inventory_count REAL DEFAULT 0,
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
  `);

  // Migration: Add new columns if they don't exist (for existing databases)
  // SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we check column existence first
  try {
    const stmt = db.prepareSync(`PRAGMA table_info(medications)`);
    const tableInfo = (stmt as any).allSync();
    const columns = tableInfo.map((row: any) => row.name);

    if (!columns.includes('schedule_start_date')) {
      db.execSync(`ALTER TABLE medications ADD COLUMN schedule_start_date TEXT`);
    }
    if (!columns.includes('next_dose_override_time')) {
      db.execSync(`ALTER TABLE medications ADD COLUMN next_dose_override_time TEXT`);
    }
  } catch (error) {
    // If migration fails, columns might already exist or table doesn't exist yet - that's okay
    // The CREATE TABLE IF NOT EXISTS above will handle new tables
    console.warn('Migration check completed (errors are normal for new databases):', error);
  }

  dbInstance = drizzle(db, { schema });

  return dbInstance;
}

export function getDatabase() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}
