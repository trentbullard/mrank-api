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
  const lcMethod = method.toLowerCase();
  const secret = process.env.SECRET || "wrong";
  const thisMinute = new Date().toISOString().slice(0, 16);
  const lastMinute = new Date(new Date() - 60000).toISOString().slice(0, 16);
  const thisMinuteHash = CryptoJS.HmacSHA512(
    thisMinute + lcMethod + path.toString(),
    secret,
  ).toString();
  const lastMinuteHash = CryptoJS.HmacSHA512(
    lastMinute + lcMethod + path.toString(),
    secret,
  ).toString();
  return token === thisMinuteHash || token === lastMinuteHash;
};

export const decryptData = cipher => {
  const secret = process.env.SECRET || "wrong";
  return JSON.parse(
    CryptoJS.AES.decrypt(cipher, secret).toString(CryptoJS.enc.Utf8),
  );
};

export const getPasswordHash = password => {
  return CryptoJS.SHA3(password).toString();
};

export const getSessionId = ({ method, route: { path }, query: { token } }) => {
  const secret = process.env.SECRET;
  const lcMethod = method.toLowerCase();
  const thisMinute = new Date().toISOString().slice(0, 16);
  return CryptoJS.HmacSHA512(
    thisMinute + lcMethod + path.toString(),
    secret,
  ).toString();
};
