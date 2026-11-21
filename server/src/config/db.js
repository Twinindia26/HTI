import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;
const isLocalDatabase = /:\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?=[:/])/i.test(env.databaseUrl);

export const pool = env.databaseUrl
  ? new Pool({
      connectionString: env.databaseUrl,
      ssl: isLocalDatabase ? false : { rejectUnauthorized: true },
    })
  : null;

export async function query(text, params = []) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured. Add your Neon PostgreSQL connection string to the server environment.");
  }

  return pool.query(text, params);
}

export async function transaction(callback) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured. Add your Neon PostgreSQL connection string to the server environment.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Database transaction rollback failed:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}
