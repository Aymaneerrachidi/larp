import { getStore } from '../server/store.js'
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED
try {
  const store = getStore()
  if (!store.migrate) throw new Error('DATABASE_URL is required for the Neon database setup.')
  await store.migrate()
  console.log('Access database schema is ready.')
  await store.close()
} catch { console.error('Database setup failed. Check DATABASE_URL and database connectivity.'); process.exitCode = 1 }
