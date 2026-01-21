/**
 * Invoice Service
 *
 * Service for ERP invoice database integration.
 * Manages connection, credential encryption, and caching.
 */

import { prisma } from '../lib/prisma.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { cacheDelete, CACHE_KEYS } from '../lib/redis.js';
import { checkInvoiceDbConnection } from '../lib/invoice-db-client.js';
import { env } from '../lib/env.js';

/** Result of invoice DB connection */
export interface InvoiceConnectionResult {
  success: boolean;
  message: string;
  connectionInfo?: {
    host: string;
    database: string;
  };
}

/** Result of invoice DB validation */
export interface InvoiceDbValidation {
  valid: boolean;
  message: string;
}

/**
 * Validates an invoice database connection string
 * @param connectionString - PostgreSQL connection string
 * @returns Validation result
 */
export async function validateInvoiceConnection(
  connectionString: string
): Promise<InvoiceDbValidation> {
  if (!connectionString || connectionString.trim().length === 0) {
    return {
      valid: false,
      message: 'Connection string is required',
    };
  }

  // Validate URL format
  try {
    const url = new URL(connectionString);
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      return {
        valid: false,
        message: 'Invalid connection string format. Must be a PostgreSQL URL.',
      };
    }
  } catch {
    return {
      valid: false,
      message: 'Invalid connection string format',
    };
  }

  // Test actual connection
  try {
    const isHealthy = await checkInvoiceDbConnection(connectionString);

    if (!isHealthy) {
      return {
        valid: false,
        message: 'Failed to connect to database. Please check your credentials.',
      };
    }

    return {
      valid: true,
      message: 'Connection is valid',
    };
  } catch (error) {
    console.error('Error validating invoice DB connection:', error);
    return {
      valid: false,
      message: 'Failed to validate connection. Please try again.',
    };
  }
}

/**
 * Connects a user to the invoice database by saving encrypted connection string
 * @param userId - User ID
 * @param connectionString - PostgreSQL connection string
 * @returns Connection result
 */
export async function connectInvoiceDb(
  userId: string,
  connectionString: string
): Promise<InvoiceConnectionResult> {
  // Validate the connection first
  const validation = await validateInvoiceConnection(connectionString);

  if (!validation.valid) {
    return {
      success: false,
      message: validation.message,
    };
  }

  try {
    // Extract connection info for display
    const url = new URL(connectionString);
    const connectionInfo = {
      host: url.hostname,
      database: url.pathname.replace('/', ''),
    };

    // Encrypt and save the connection string
    const encryptedUrl = encrypt(connectionString);

    await prisma.user.update({
      where: { id: userId },
      data: {
        invoiceDbUrl: encryptedUrl,
        invoiceDbValid: true,
        invoiceDbConnectedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `Successfully connected to invoice database at ${connectionInfo.host}`,
      connectionInfo,
    };
  } catch (error) {
    console.error('Error connecting to invoice DB:', error);

    return {
      success: false,
      message: 'Failed to connect to invoice database. Please try again.',
    };
  }
}

/**
 * Disconnects a user from the invoice database
 * Also invalidates all invoice-related cache
 * @param userId - User ID
 * @returns true if disconnected successfully
 */
export async function disconnectInvoiceDb(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        invoiceDbUrl: null,
        invoiceDbValid: false,
        invoiceDbConnectedAt: null,
      },
    });

    // Invalidate all invoice caches for this user
    const cachePatterns = [
      CACHE_KEYS.invoiceRevenue?.(userId, '*', '*', '*'),
      CACHE_KEYS.invoiceTax?.(userId, '*', '*'),
      CACHE_KEYS.invoiceClients?.(userId, '*', '*'),
      CACHE_KEYS.invoiceItems?.(userId, '*', '*'),
      CACHE_KEYS.invoiceSearch?.(userId, '*'),
      CACHE_KEYS.invoiceSeries?.(userId),
    ].filter(Boolean);

    // Delete cache entries (if Redis supports pattern deletion)
    for (const pattern of cachePatterns) {
      if (pattern) {
        await cacheDelete(pattern);
      }
    }

    return true;
  } catch (error) {
    console.error('Error disconnecting from invoice DB:', error);
    return false;
  }
}

/**
 * Checks if a user is connected to the invoice database
 * @param userId - User ID
 * @returns Connection status
 */
export async function getInvoiceDbConnectionStatus(userId: string): Promise<{
  connected: boolean;
  connectedAt?: Date;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        invoiceDbValid: true,
        invoiceDbConnectedAt: true,
      },
    });

    return {
      connected: user?.invoiceDbValid ?? false,
      connectedAt: user?.invoiceDbConnectedAt ?? undefined,
    };
  } catch (error) {
    console.error('Error getting invoice DB connection status:', error);
    return { connected: false };
  }
}

/**
 * Gets the decrypted invoice DB connection string for a user
 * Falls back to global INVOICE_DATABASE_URL if user doesn't have one
 * @param userId - User ID
 * @returns Decrypted connection string or null
 */
export async function getInvoiceConnectionForUser(userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        invoiceDbUrl: true,
        invoiceDbValid: true,
      },
    });

    // If user has a valid connection, decrypt and return it
    if (user?.invoiceDbUrl && user.invoiceDbValid) {
      try {
        return decrypt(user.invoiceDbUrl);
      } catch (error) {
        console.error('Error decrypting invoice DB URL:', error);
        // Mark as invalid if decryption fails
        await prisma.user.update({
          where: { id: userId },
          data: { invoiceDbValid: false },
        });
        return null;
      }
    }

    // Fall back to global invoice DB URL
    return env.INVOICE_DATABASE_URL || null;
  } catch (error) {
    console.error('Error getting invoice connection for user:', error);
    // Even if there's an error fetching user, try to use global fallback
    return env.INVOICE_DATABASE_URL || null;
  }
}

/**
 * Tests the current invoice DB connection for a user
 * @param userId - User ID
 * @returns true if connection is healthy
 */
export async function testInvoiceConnection(userId: string): Promise<boolean> {
  try {
    const connectionString = await getInvoiceConnectionForUser(userId);

    if (!connectionString) {
      return false;
    }

    return await checkInvoiceDbConnection(connectionString);
  } catch (error) {
    console.error('Error testing invoice connection:', error);
    return false;
  }
}

/**
 * Refreshes the invoice DB connection validity for a user
 * Useful for periodic health checks
 * @param userId - User ID
 * @returns Updated validity status
 */
export async function refreshInvoiceConnectionValidity(userId: string): Promise<boolean> {
  try {
    const isHealthy = await testInvoiceConnection(userId);

    // Update the user's connection validity
    await prisma.user.update({
      where: { id: userId },
      data: { invoiceDbValid: isHealthy },
    });

    return isHealthy;
  } catch (error) {
    console.error('Error refreshing invoice connection validity:', error);
    return false;
  }
}
