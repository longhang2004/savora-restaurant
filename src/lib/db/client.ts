/**
 * Drizzle database client (PostgreSQL via postgres-js).
 *
 * - Supabase connections use SSL automatically (host contains supabase.co).
 * - The client connects lazily; this module is safe to import during builds
 *   as long as DATABASE_URL is present in the environment.
 */
import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { serverEnv } from '@/config/env';
import * as schema from './schema';

const url = serverEnv.DATABASE_URL;
const useSsl = url.includes('supabase.co') || url.includes('sslmode=require');

export const queryClient = postgres(url, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 15,
  ...(useSsl && !url.includes('sslmode') ? { ssl: 'require' } : {}),
  prepare: false,
});

export const db = drizzle(queryClient, { schema });

export type DB = typeof db;
