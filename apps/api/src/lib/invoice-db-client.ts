import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env.js';

let invoicePool: Pool | null = null;

/**
 * Connection pool configuration for invoice database
 */
const POOL_CONFIG = {
  max: 10, // Maximum number of clients
  min: 2, // Minimum number of clients
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection not established
  statement_timeout: 30000, // Query timeout: 30 seconds
};

/**
 * Get or create the invoice database connection pool
 * @param connectionString Optional connection string (uses env.INVOICE_DATABASE_URL if not provided)
 * @returns Pool instance
 */
export function getInvoicePool(connectionString?: string): Pool {
  if (!invoicePool) {
    const connStr = connectionString || env.INVOICE_DATABASE_URL;

    if (!connStr) {
      throw new Error('Invoice database connection string not configured');
    }

    invoicePool = new Pool({
      connectionString: connStr,
      ...POOL_CONFIG,
    });

    // Set read-only mode for safety
    invoicePool.on('connect', async (client: PoolClient) => {
      try {
        await client.query('SET default_transaction_read_only = on');
      } catch (error) {
        console.error('Failed to set read-only mode:', error);
      }
    });

    // Handle pool errors
    invoicePool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    console.log('Invoice database pool created');
  }

  return invoicePool;
}

/**
 * Execute a query on the invoice database
 * @param text SQL query text
 * @param params Query parameters
 * @returns Query result
 */
export async function queryInvoiceDb<T extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getInvoicePool();

  try {
    const result = await pool.query<T>(text, params);
    return result;
  } catch (error) {
    console.error('Invoice DB query error:', error);
    throw error;
  }
}

/**
 * Check if the invoice database connection is healthy
 * @param connectionString Optional connection string to test
 * @returns true if connection is healthy
 */
export async function checkInvoiceDbConnection(
  connectionString?: string
): Promise<boolean> {
  let client: PoolClient | null = null;

  try {
    const pool = connectionString
      ? new Pool({ connectionString, ...POOL_CONFIG })
      : getInvoicePool();

    client = await pool.query('SELECT 1 as health_check').then(() => null);

    // If we created a temporary pool, close it
    if (connectionString && pool !== invoicePool) {
      await pool.end();
    }

    return true;
  } catch (error) {
    console.error('Invoice DB health check failed:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Close the invoice database pool
 * Should only be called on application shutdown
 */
export async function closeInvoiceDbPool(): Promise<void> {
  if (invoicePool) {
    await invoicePool.end();
    invoicePool = null;
    console.log('Invoice database pool closed');
  }
}

/**
 * Execute a transaction on the invoice database
 * NOTE: This is read-only and should only be used for multi-query consistency
 * @param callback Function to execute within transaction
 * @returns Transaction result
 */
export async function invoiceDbTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getInvoicePool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
