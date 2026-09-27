// The records database: real Postgres, compiled to WebAssembly, running in the
// browser tab. About 3 MB, no server, no account, no setup for the user.
//
// Where the data lives: the browser's IndexedDB, under "voice-writer". That means
// it is on this device only, and the browser can delete it (on iPhone, after 7
// days without a visit, unless the app is added to the Home Screen). So the
// database file the user downloads is the real backup, not this.
//
// Every row has an id and updated_at from the start, so syncing between devices
// can be added later without changing the schema.

import { PGlite } from "@electric-sql/pglite";

const DATA_DIR = "idb://voice-writer";

let db = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS entries (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    person      text        NOT NULL DEFAULT '',
    text        text        NOT NULL,
    seconds     numeric,
    model       text
  );
  CREATE INDEX IF NOT EXISTS entries_person_idx ON entries (person);
`;

export async function open() {
  if (db) return db;
  db = new PGlite(DATA_DIR);
  await db.exec(SCHEMA);
  return db;
}

export async function addEntry({ text, seconds, model }) {
  const database = await open();
  const result = await database.query(
    "INSERT INTO entries (text, seconds, model) VALUES ($1, $2, $3) RETURNING *",
    [text, seconds, model],
  );
  return result.rows[0];
}

export async function listEntries() {
  const database = await open();
  const result = await database.query("SELECT * FROM entries ORDER BY created_at DESC");
  return result.rows;
}

export async function setPerson(id, person) {
  const database = await open();
  await database.query(
    "UPDATE entries SET person = $1, updated_at = now() WHERE id = $2",
    [person, id],
  );
}

export async function deleteEntry(id) {
  const database = await open();
  await database.query("DELETE FROM entries WHERE id = $1", [id]);
}

export async function countEntries() {
  const database = await open();
  const result = await database.query("SELECT count(*)::int AS n FROM entries");
  return result.rows[0].n;
}

// ------------------------------------------------------------------- exports --

export async function toJson() {
  return JSON.stringify(await listEntries(), null, 2);
}

export async function toCsv() {
  const rows = await listEntries();
  const columns = ["id", "created_at", "person", "text", "seconds", "model"];
  // A quoted CSV field escapes its own quotes by doubling them. Transcripts
  // contain commas and newlines, so every field is quoted.
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns.join(","), ...rows.map((row) => columns.map((c) => escape(row[c])).join(","))].join("\n");
}

// The whole database as one file, for backup. Restoring it replaces everything.
export async function dumpFile() {
  const database = await open();
  return database.dumpDataDir("gzip");
}

export async function restoreFile(file) {
  if (db) {
    await db.close();
    db = null;
  }
  db = await PGlite.create({ loadDataDir: file, dataDir: DATA_DIR });
  await db.exec(SCHEMA);
  return db;
}
