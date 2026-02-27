/**
 * MongoDB Configuration
 *
 * Connection management for MongoDB (Atlas or local) with connection pooling,
 * retry logic, and health checks.
 *
 * Story 4.3: MongoDB Historical Storage — Queryable Run History
 *
 * @module MongoConfig
 */

const { MongoClient } = require('mongodb');

/**
 * Default MongoDB URI (local fallback)
 */
const DEFAULT_URI = 'mongodb://localhost:27017';

/**
 * Database name
 */
const DB_NAME = 'b2g_squad_engine';

/**
 * Collection names
 */
const COLLECTIONS = {
  SQUAD_RUNS: 'squad_runs',
};

/**
 * Connection pool options
 */
const POOL_OPTIONS = {
  maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE || '10', 10),
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  retryReads: true,
};

/**
 * Shared client singleton
 * @type {MongoClient|null}
 */
let _client = null;

/**
 * Get or create the shared MongoClient singleton
 * @returns {MongoClient} Connected MongoClient instance
 */
function getClient() {
  if (!_client) {
    const uri = process.env.MONGODB_URI || DEFAULT_URI;
    _client = new MongoClient(uri, POOL_OPTIONS);
  }
  return _client;
}

/**
 * Get the database instance
 * @returns {import('mongodb').Db} MongoDB database
 */
function getDb() {
  return getClient().db(DB_NAME);
}

/**
 * Get a collection by name
 * @param {string} name - Collection name
 * @returns {import('mongodb').Collection} MongoDB collection
 */
function getCollection(name) {
  return getDb().collection(name);
}

/**
 * Health check — ping MongoDB to verify connectivity
 * @returns {Promise<boolean>} true if MongoDB responds to ping
 */
async function ping() {
  try {
    const client = getClient();
    await client.db('admin').command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Close the shared MongoClient connection
 * @returns {Promise<void>}
 */
async function close() {
  if (_client) {
    await _client.close();
    _client = null;
  }
}

/**
 * Reset client (for testing)
 */
function _resetClient() {
  _client = null;
}

/**
 * Set client (for testing with mock)
 * @param {MongoClient} client
 */
function _setClient(client) {
  _client = client;
}

module.exports = {
  getClient,
  getDb,
  getCollection,
  ping,
  close,
  _resetClient,
  _setClient,
  DEFAULT_URI,
  DB_NAME,
  COLLECTIONS,
  POOL_OPTIONS,
};
