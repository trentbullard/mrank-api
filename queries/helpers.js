import { Pool } from "pg";
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
