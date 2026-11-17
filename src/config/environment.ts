import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve("config/.env"), quiet: true });

export const allowedOrigins = () =>
  (process.env.FRONTEND_ORIGIN || "http://localhost:3000").split(",").map(value => value.trim()).filter(Boolean);

export const validateEnvironment = () => {
  const required = ["DB_URL", "ACCESS_TOKEN_USER", "ACCESS_TOKEN_ADMIN", "REFRESH_TOKEN_USER", "REFRESH_TOKEN_ADMIN"];
  const missing = required.filter(key => !process.env[key]?.trim());
  if (missing.length) throw new Error("Missing environment variables: " + missing.join(", "));
  const secrets = required.slice(1).map(key => process.env[key]!);
  if (secrets.some(secret => secret.length < 32) || new Set(secrets).size !== secrets.length) {
    throw new Error("JWT secrets must be distinct and at least 32 characters long");
  }
  const rounds = Number(process.env.SALT_ROUND || 12);
  if (!Number.isInteger(rounds) || rounds < 10 || rounds > 15) throw new Error("SALT_ROUND must be an integer from 10 to 15");
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
};
