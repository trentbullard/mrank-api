import { Pool } from "pg";
import CryptoJS from "crypto-js";
import dotenv from "dotenv";
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

export const query = (sql, response) => {
  console.log(`  db:`, sql.replace(/\n/g, " ").replace(/\s\s+/g, " "));
  pool.query(sql, (error, results) => {
    if (error) {
      response.status(500).json({ error });
    } else {
      response.status(200).json(results.rows);
    }
  });
};

export const statement = (sql, response) => {
  console.log(`  db:`, sql.replace(/\n/g, " ").replace(/\s\s+/g, " "));
  pool.query(sql, (error, results) => {
    if (error) {
      response.status(500).json({ error });
    } else {
      response.status(200).json(results);
    }
  });
};

export const auth = ({ method, route: { path }, query: { token } }) => {
  let lcMethod = method.toLowerCase();
  let secret = process.env.SECRET || "wrong";
  let thisMinute = new Date().toISOString().slice(0, 16);
  let lastMinute = new Date(new Date() - 60000).toISOString().slice(0, 16);
  let thisMinuteHash = CryptoJS.HmacSHA512(
    thisMinute + lcMethod + path.toString(),
    secret,
  ).toString();
  let lastMinuteHash = CryptoJS.HmacSHA512(
    lastMinute + lcMethod + path.toString(),
    secret,
  ).toString();
  return token === thisMinuteHash || token === lastMinuteHash;
};
