import path from "path";
import * as dotenv from "dotenv";

// Load environment variables from the root .env file relative to this source file
const resolvedPath = path.resolve(import.meta.dirname, "../../../.env");
const result = dotenv.config({ path: resolvedPath });
console.log("ENV.TS: Resolved Path:", resolvedPath);
console.log("ENV.TS: dotenv result:", result);
console.log("ENV.TS: process.env.DATABASE_URL:", process.env.DATABASE_URL);
