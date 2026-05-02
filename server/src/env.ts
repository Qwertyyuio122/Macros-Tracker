import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Always load `server/.env` regardless of process.cwd() (fixes USDA key when starting from repo root). */
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(serverRoot, ".env") });
