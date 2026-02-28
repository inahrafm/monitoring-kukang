const { Pool } = require("pg");
require("dotenv").config();

// Validasi Environment Variables
const requiredEnv = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    console.error(`❌ Missing required Environment Variable: ${env}`);
  }
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle PostgreSQL client", err);
  process.exit(-1);
});

// Pastikan export object memiliki fungsi query
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
