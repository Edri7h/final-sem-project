import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';
const here=dirname(fileURLToPath(import.meta.url));
dotenv.config({path:resolve(here,'./.env')});
export default defineConfig({ schema: './src/schema.js', out: './drizzle', dialect: 'postgresql', dbCredentials: { url: process.env.DATABASE_URL } });
