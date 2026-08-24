import dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required. Set it in server/.env');
}

// pg defaults to 10, which is thin for a burst of a thousand-plus answers
// arriving in the same few seconds. Render Postgres allows 97 connections by
// default, so there is room — but keep this well under that ceiling.
const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX) || 20,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
