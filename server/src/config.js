import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
dotenv.config({path:resolve(here,'../.env')});
