import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Falta la variable DATABASE_URL en el archivo .env",
  );
}

// prepare: false es necesario porque el pooler de Supabase (pgbouncer)
// no soporta prepared statements en modo transacción.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export { schema };
