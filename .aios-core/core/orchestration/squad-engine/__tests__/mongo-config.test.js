/**
 * MongoDB Config - Unit Tests
 * Story 4.3 - Task 1: MongoDB Connection Setup
 */

const {
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
} = require('../mongo-config');

/**
 * Create mock MongoClient (manual mock pattern matching existing tests)
 */
function createMockMongoClient(options = {}) {
  const { shouldThrow = false } = options;

  const mockCollection = {
    find: () => mockCollection,
    insertOne: async () => ({ insertedId: 'mock-1' }),
    updateOne: async () => ({ matchedCount: 1 }),
    deleteMany: async () => ({ deletedCount: 0 }),
    createIndex: async () => 'idx_name',
    countDocuments: async () => 0,
    aggregate: () => ({ toArray: async () => [] }),
    sort: () => mockCollection,
    skip: () => mockCollection,
    limit: () => mockCollection,
    toArray: async () => [],
  };

  const mockDb = {
    collection: () => mockCollection,
    command: shouldThrow
      ? async () => { throw new Error('Connection failed'); }
      : async () => ({ ok: 1 }),
  };

  let closeCalled = false;

  const mockClient = {
    db: () => mockDb,
    close: async () => { closeCalled = true; },
    _mockDb: mockDb,
    _mockCollection: mockCollection,
    _wasCloseCalled: () => closeCalled,
  };

  return mockClient;
}

describe('MongoConfig', () => {
  afterEach(async () => {
    _resetClient();
  });

  describe('constants', () => {
    test('DEFAULT_URI should be localhost', () => {
      expect(DEFAULT_URI).toBe('mongodb://localhost:27017');
    });

    test('DB_NAME should be b2g_squad_engine', () => {
      expect(DB_NAME).toBe('b2g_squad_engine');
    });

    test('COLLECTIONS should include SQUAD_RUNS', () => {
      expect(COLLECTIONS.SQUAD_RUNS).toBe('squad_runs');
    });

    test('POOL_OPTIONS should have reasonable defaults', () => {
      expect(POOL_OPTIONS.maxPoolSize).toBeGreaterThanOrEqual(2);
      expect(POOL_OPTIONS.minPoolSize).toBe(2);
      expect(POOL_OPTIONS.retryWrites).toBe(true);
      expect(POOL_OPTIONS.retryReads).toBe(true);
    });
  });

  describe('getDb()', () => {
    test('should return the database', () => {
      const mockClient = createMockMongoClient();
      _setClient(mockClient);

      const db = getDb();
      expect(db).toBeDefined();
      expect(db.command).toBeDefined();
    });
  });

  describe('getCollection()', () => {
    test('should return a collection', () => {
      const mockClient = createMockMongoClient();
      _setClient(mockClient);

      const col = getCollection('squad_runs');
      expect(col).toBeDefined();
      expect(col.insertOne).toBeDefined();
    });
  });

  describe('ping()', () => {
    test('should return true when MongoDB responds', async () => {
      const mockClient = createMockMongoClient();
      _setClient(mockClient);

      const result = await ping();
      expect(result).toBe(true);
    });

    test('should return false when MongoDB fails', async () => {
      const mockClient = createMockMongoClient({ shouldThrow: true });
      _setClient(mockClient);

      const result = await ping();
      expect(result).toBe(false);
    });
  });

  describe('close()', () => {
    test('should close client connection', async () => {
      const mockClient = createMockMongoClient();
      _setClient(mockClient);

      await close();
      expect(mockClient._wasCloseCalled()).toBe(true);
    });

    test('should be idempotent (safe to call twice)', async () => {
      const mockClient = createMockMongoClient();
      _setClient(mockClient);

      await close();
      await close(); // Should not throw
    });
  });
});
