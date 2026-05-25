import { Pool } from 'pg';

export const DATABASE_POOL = 'DATABASE_POOL';

const isCloudDb = (url?: string) =>
  !!url && !url.includes('localhost') && !url.includes('127.0.0.1');

export const databaseProviders = [
  {
    provide: DATABASE_POOL,
    useFactory: () =>
      new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isCloudDb(process.env.DATABASE_URL)
          ? { rejectUnauthorized: false }
          : false,
      }),
  },
];
