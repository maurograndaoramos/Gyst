#!/usr/bin/env node
/**
 * Database Migration Runner
 * Runs SQL migration files in order and tracks migration state
 */

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Database configuration
const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || join(__dirname, 'db.sqlite')
const MIGRATIONS_DIR = join(__dirname, 'migrations')

console.log(`Database path: ${DB_PATH}`)
console.log(`Migrations directory: ${MIGRATIONS_DIR}`)

// Initialize database connection
const db = new Database(DB_PATH)

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON')

// Create migrations tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )
`)

/**
 * Get list of applied migrations
 */
function getAppliedMigrations() {
  try {
    const rows = db.prepare('SELECT filename FROM migrations ORDER BY applied_at').all()
    return rows.map(row => row.filename)
  } catch (error) {
    console.warn('Could not fetch applied migrations:', error.message)
    return []
  }
}

/**
 * Get list of available migration files
 */
function getAvailableMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory found')
    return []
  }

  return readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort()
}

/**
 * Apply a single migration
 */
function applyMigration(filename) {
  const filePath = join(MIGRATIONS_DIR, filename)
  const sql = readFileSync(filePath, 'utf-8')
  
  console.log(`Applying migration: ${filename}`)
  
  // Execute migration in a transaction
  const transaction = db.transaction(() => {
    // Split SQL into individual statements and execute
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    for (const statement of statements) {
      try {
        db.exec(statement)
      } catch (error) {
        console.error(`Error executing statement: ${statement}`)
        throw error
      }
    }
    
    // Record migration as applied
    db.prepare('INSERT INTO migrations (id, filename) VALUES (?, ?)')
      .run(crypto.randomUUID(), filename)
  })
  
  try {
    transaction()
    console.log(`✓ Migration ${filename} applied successfully`)
  } catch (error) {
    console.error(`✗ Failed to apply migration ${filename}:`, error.message)
    throw error
  }
}

/**
 * Run pending migrations
 */
function runMigrations() {
  const appliedMigrations = getAppliedMigrations()
  const availableMigrations = getAvailableMigrations()
  
  console.log(`Applied migrations: ${appliedMigrations.length}`)
  console.log(`Available migrations: ${availableMigrations.length}`)
  
  const pendingMigrations = availableMigrations.filter(
    migration => !appliedMigrations.includes(migration)
  )
  
  if (pendingMigrations.length === 0) {
    console.log('No pending migrations')
    return
  }
  
  console.log(`\nRunning ${pendingMigrations.length} pending migration(s)...`)
  
  for (const migration of pendingMigrations) {
    applyMigration(migration)
  }
  
  console.log('\n✓ All migrations completed successfully')
}

/**
 * Show migration status
 */
function showStatus() {
  const appliedMigrations = getAppliedMigrations()
  const availableMigrations = getAvailableMigrations()
  
  console.log('\n=== Migration Status ===')
  console.log(`Database: ${DB_PATH}`)
  console.log(`Applied: ${appliedMigrations.length}`)
  console.log(`Available: ${availableMigrations.length}`)
  
  if (appliedMigrations.length > 0) {
    console.log('\nApplied migrations:')
    appliedMigrations.forEach(migration => {
      console.log(`  ✓ ${migration}`)
    })
  }
  
  const pendingMigrations = availableMigrations.filter(
    migration => !appliedMigrations.includes(migration)
  )
  
  if (pendingMigrations.length > 0) {
    console.log('\nPending migrations:')
    pendingMigrations.forEach(migration => {
      console.log(`  • ${migration}`)
    })
  }
}

// Command line interface
const command = process.argv[2]

try {
  switch (command) {
    case 'run':
      runMigrations()
      break
    case 'status':
      showStatus()
      break
    case 'help':
    default:
      console.log(`
Usage: node migrate.js [command]

Commands:
  run     - Run pending migrations
  status  - Show migration status
  help    - Show this help message

Examples:
  node migrate.js run
  node migrate.js status
`)
      break
  }
} catch (error) {
  console.error('Migration failed:', error.message)
  process.exit(1)
} finally {
  db.close()
}
