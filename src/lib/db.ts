import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.PGHOST ?? 'postgres',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'ext_orders',
  user: process.env.PGUSER ?? 'n8n',
  password: process.env.PGPASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
})

export default pool
