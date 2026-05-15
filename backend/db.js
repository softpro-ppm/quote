const mysql = require("mysql2/promise");

let pool;

function getPool() {
  if (pool) return pool;

  const {
    DB_HOST,
    DB_PORT = "3306",
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
  } = process.env;

  if (!DB_HOST || !DB_NAME || !DB_USER) {
    throw new Error(
      "Database configuration missing. Set DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD.",
    );
  }

  pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "Z",
    dateStrings: true,
  });

  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

module.exports = { getPool, query };
