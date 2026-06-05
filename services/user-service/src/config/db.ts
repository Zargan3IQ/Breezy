import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDatabase = async (): Promise<void> => {
  let retries = 5;
  while (retries) {
    try {
      const sqlPath = path.join(__dirname, '../models/user.model.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sql);
      console.log('Table "users" verified / created successfully.');
      break;
    } catch (error) {
      console.log('The database is not ready yet, retrying in 3 seconds...');
      retries -= 1;
      await new Promise((res) => setTimeout(res, 3000));
      if (retries === 0) {
        console.error('Unable to connect to the database :', error);
      }
    }
  }
};

pool.on('connect', () => {
  console.log('Connected to the PostgreSQL database of the User Service');
});

initDatabase();

export default pool;