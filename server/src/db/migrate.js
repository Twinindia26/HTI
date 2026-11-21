import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool, transaction } from "../config/db.js";

const dbDirectory = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured; database migrations cannot run.");
  }

  const baseline = await readFile(path.join(dbDirectory, "schema.sql"), "utf8");
  await transaction((client) => client.query(baseline));
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationDirectory = path.join(dbDirectory, "migrations");
  const migrationNames = (await readdir(migrationDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const name of migrationNames) {
    const existing = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [name],
    );
    if (existing.rowCount) {
      continue;
    }

    const sql = await readFile(path.join(migrationDirectory, name), "utf8");
    await transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock($1)", [845091327]);
      const applied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [name],
      );
      if (applied.rowCount) {
        return;
      }
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
    });
    console.log(`Applied database migration: ${name}`);
  }
}

try {
  await migrate();
} finally {
  await pool?.end();
}
