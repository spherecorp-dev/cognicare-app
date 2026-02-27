/**
 * Unit Tests: MetaAdLibraryClient, TikTokCreativeClient, Semaphore, APIErrorLogger, GracefulDegradation
 * Story 2.5: External API Integrations (AC6, AC8, AC9)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { MetaAdLibraryClient } = require('../spy-scraping/meta-ad-library');
const { TikTokCreativeClient } = require('../spy-scraping/tiktok-creative');
const { Semaphore } = require('../spy-scraping/semaphore');
const { APIErrorLogger } = require('../api-error-logger');
const { withGracefulDegradation, isSkippedResult } = require('../graceful-degradation');
const { ConfigError } = require('../image-generators/providers/dall-e');

// ─── Helpers ────────────────────────────────────────────────────────────────

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aios-spy-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createMetaClient(overrides = {}) {
  return new MetaAdLibraryClient({
    accessToken: 'test-meta-token',
    runId: 'test-run-001',
    baseDir: tmpDir,
    maxConcurrency: 2,
    fetchFn: overrides.fetchFn || jest.fn(),
    ...overrides,
  });
}

function createTikTokClient(overrides = {}) {
  return new TikTokCreativeClient({
    accessToken: 'test-tiktok-token',
    runId: 'test-run-001',
    baseDir: tmpDir,
    maxConcurrency: 2,
    fetchFn: overrides.fetchFn || jest.fn(),
    ...overrides,
  });
}

// ─── Semaphore ──────────────────────────────────────────────────────────────

describe('Semaphore', () => {
  it('should allow up to maxConcurrent simultaneous tasks', async () => {
    const sem = new Semaphore(2);

    await sem.acquire();
    await sem.acquire();
    expect(sem.active).toBe(2);
    expect(sem.pending).toBe(0);

    // Third acquire should be queued
    let thirdResolved = false;
    const thirdPromise = sem.acquire().then(() => { thirdResolved = true; });

    expect(sem.pending).toBe(1);
    expect(thirdResolved).toBe(false);

    // Release one slot
    sem.release();
    await thirdPromise;

    expect(thirdResolved).toBe(true);
    expect(sem.active).toBe(2);
    expect(sem.pending).toBe(0);

    sem.release();
    sem.release();
  });

  it('should default to 5 max concurrent', () => {
    const sem = new Semaphore();
    expect(sem.maxConcurrent).toBe(5);
  });

  it('should process queue in FIFO order', async () => {
    const sem = new Semaphore(1);
    const order = [];

    await sem.acquire();

    const p1 = sem.acquire().then(() => order.push(1));
    const p2 = sem.acquire().then(() => order.push(2));

    expect(sem.pending).toBe(2);

    sem.release();
    await p1;
    sem.release();
    await p2;
    sem.release();

    expect(order).toEqual([1, 2]);
  });
});

// ─── APIErrorLogger ─────────────────────────────────────────────────────────

describe('APIErrorLogger', () => {
  it('should log error entry to JSONL file', () => {
    const logger = new APIErrorLogger(tmpDir);

    logger.log('run-123', {
      provider: 'dall-e',
      error_type: 'rate_limit',
      status_code: 429,
      message: 'Rate limit exceeded',
      retry_attempt: 1,
    });

    const entries = logger.read('run-123');
    expect(entries).toHaveLength(1);
    expect(entries[0].provider).toBe('dall-e');
    expect(entries[0].error_type).toBe('rate_limit');
    expect(entries[0].status_code).toBe(429);
    expect(entries[0].message).toBe('Rate limit exceeded');
    expect(entries[0].retry_attempt).toBe(1);
    expect(entries[0].timestamp).toBeDefined();
  });

  it('should append multiple entries', () => {
    const logger = new APIErrorLogger(tmpDir);

    logger.log('run-123', { provider: 'dall-e', error_type: 'timeout', message: 'Timeout 1' });
    logger.log('run-123', { provider: 'whisper', error_type: 'api_error', message: 'Error 2' });

    const entries = logger.read('run-123');
    expect(entries).toHaveLength(2);
    expect(entries[0].provider).toBe('dall-e');
    expect(entries[1].provider).toBe('whisper');
  });

  it('should return empty array for non-existent run', () => {
    const logger = new APIErrorLogger(tmpDir);
    expect(logger.read('non-existent')).toEqual([]);
  });

  it('should create directory recursively', () => {
    const logger = new APIErrorLogger(tmpDir);
    logger.log('deep-run', { provider: 'test', error_type: 'test', message: 'test' });

    const logPath = path.join(tmpDir, '.aios', 'squad-runs', 'deep-run', 'logs', 'api-errors.jsonl');
    expect(fs.existsSync(logPath)).toBe(true);
  });

  it('should not throw on logging failure', () => {
    // Use a path that's definitely invalid
    const logger = new APIErrorLogger('/dev/null/impossible');
    expect(() => {
      logger.log('run', { provider: 'test', error_type: 'test', message: 'test' });
    }).not.toThrow();
  });
});

// ─── MetaAdLibraryClient ───────────────────────────────────────────────────

describe('MetaAdLibraryClient', () => {
  describe('constructor', () => {
    it('should throw ConfigError if no access token', () => {
      expect(() => new MetaAdLibraryClient({})).toThrow(ConfigError);
    });

    it('should initialize with defaults', () => {
      const client = createMetaClient();
      expect(client.name).toBe('meta-ad-library');
    });
  });

  describe('downloadAds()', () => {
    it('should return empty result when no listings found', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const client = createMetaClient({ fetchFn });
      const result = await client.downloadAds({ search_terms: 'test' });

      expect(result).toEqual({ total: 0, downloaded: 0, failed: 0, files: [] });
    });

    it('should download ads and save manifest', async () => {
      const fetchFn = jest.fn()
        // First call: fetch listings
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              { id: 'ad-1', page_name: 'Brand A', ad_snapshot_url: 'https://example.com/snap1' },
              { id: 'ad-2', page_name: 'Brand B', ad_snapshot_url: 'https://example.com/snap2' },
            ],
          }),
        })
        // Second call: download ad-1 snapshot
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => Buffer.from('<html>Ad 1</html>').buffer,
        })
        // Third call: download ad-2 snapshot
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => Buffer.from('<html>Ad 2</html>').buffer,
        });

      const client = createMetaClient({ fetchFn });
      const result = await client.downloadAds({ search_terms: 'test' });

      expect(result.total).toBe(2);
      expect(result.downloaded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.files).toHaveLength(2);

      // Verify manifest was saved
      const downloadDir = path.join(tmpDir, '.aios', 'squad-runs', 'test-run-001', 'spy-downloads', 'meta');
      const manifest = JSON.parse(fs.readFileSync(path.join(downloadDir, 'manifest.json'), 'utf8'));
      expect(manifest.total).toBe(2);
      expect(manifest.downloaded).toBe(2);
    });

    it('should handle download failures gracefully', async () => {
      const fetchFn = jest.fn()
        // Fetch listings
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              { id: 'ad-1', ad_snapshot_url: 'https://example.com/snap1' },
              { id: 'ad-2', ad_snapshot_url: 'https://example.com/snap2' },
            ],
          }),
        })
        // First download fails
        .mockResolvedValueOnce({ ok: false, status: 404 })
        // Second download succeeds
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => Buffer.from('<html>Ad 2</html>').buffer,
        });

      const client = createMetaClient({ fetchFn });
      const result = await client.downloadAds({ search_terms: 'test' });

      expect(result.total).toBe(2);
      expect(result.downloaded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should handle ad without snapshot URL', async () => {
      const fetchFn = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ id: 'ad-no-url', page_name: 'Brand' }],
          }),
        });

      const client = createMetaClient({ fetchFn });
      const result = await client.downloadAds({ search_terms: 'test' });

      expect(result.total).toBe(1);
      expect(result.downloaded).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should throw on API listing error', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      });

      const client = createMetaClient({ fetchFn });
      await expect(client.downloadAds({ search_terms: 'test' })).rejects.toThrow('Meta Ad Library API error: 401');
    });

    it('should respect concurrency limit via semaphore', async () => {
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const fetchFn = jest.fn()
        // Fetch listings
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              { id: '1', ad_snapshot_url: 'https://example.com/1' },
              { id: '2', ad_snapshot_url: 'https://example.com/2' },
              { id: '3', ad_snapshot_url: 'https://example.com/3' },
              { id: '4', ad_snapshot_url: 'https://example.com/4' },
            ],
          }),
        })
        // Downloads
        .mockImplementation(async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise(r => setTimeout(r, 50));
          currentConcurrent--;
          return {
            ok: true,
            arrayBuffer: async () => Buffer.from('data').buffer,
          };
        });

      const client = createMetaClient({ fetchFn, maxConcurrency: 2 });
      await client.downloadAds({ search_terms: 'test' });

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should save metadata JSON alongside downloaded files', async () => {
      const fetchFn = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              { id: 'ad-1', page_name: 'Brand A', ad_creative_bodies: ['Body text'], ad_creative_link_titles: ['Title'], ad_snapshot_url: 'https://example.com/snap1' },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => Buffer.from('<html>Ad</html>').buffer,
        });

      const client = createMetaClient({ fetchFn });
      await client.downloadAds({ search_terms: 'test' });

      const downloadDir = path.join(tmpDir, '.aios', 'squad-runs', 'test-run-001', 'spy-downloads', 'meta');
      const metaPath = path.join(downloadDir, 'ad-ad-1.meta.json');
      expect(fs.existsSync(metaPath)).toBe(true);

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      expect(meta.page_name).toBe('Brand A');
      expect(meta.downloaded_at).toBeDefined();
    });

    it('should use default download dir when no runId', () => {
      const client = new MetaAdLibraryClient({
        accessToken: 'token',
        baseDir: tmpDir,
        fetchFn: jest.fn(),
        runId: null,
      });
      const dir = client._getDownloadDir();
      expect(dir).toBe(path.join(tmpDir, '.aios', 'spy-downloads', 'meta'));
    });
  });
});

// ─── TikTokCreativeClient ──────────────────────────────────────────────────

describe('TikTokCreativeClient', () => {
  describe('constructor', () => {
    it('should throw ConfigError if no access token', () => {
      expect(() => new TikTokCreativeClient({})).toThrow(ConfigError);
    });

    it('should initialize with defaults', () => {
      const client = createTikTokClient();
      expect(client.name).toBe('tiktok-creative');
    });
  });

  describe('downloadVideos()', () => {
    it('should return empty result when no videos found', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { videos: [] } }),
      });

      const client = createTikTokClient({ fetchFn });
      const result = await client.downloadVideos({ keyword: 'test' });

      expect(result).toEqual({ total: 0, downloaded: 0, failed: 0, files: [] });
    });

    it('should download videos and save manifest', async () => {
      const fetchFn = jest.fn()
        // Fetch listings
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              videos: [
                { id: 'v1', title: 'Video 1', video_url: 'https://example.com/v1.mp4', duration: 30 },
                { id: 'v2', title: 'Video 2', video_url: 'https://example.com/v2.mp4', duration: 60 },
              ],
            },
          }),
        })
        // Download video 1
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => Buffer.from('video-data-1').buffer,
        })
        // Download video 2
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => Buffer.from('video-data-2').buffer,
        });

      const client = createTikTokClient({ fetchFn });
      const result = await client.downloadVideos({ keyword: 'test' });

      expect(result.total).toBe(2);
      expect(result.downloaded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.files).toHaveLength(2);

      // Verify manifest
      const downloadDir = path.join(tmpDir, '.aios', 'squad-runs', 'test-run-001', 'spy-downloads', 'tiktok');
      const manifest = JSON.parse(fs.readFileSync(path.join(downloadDir, 'manifest.json'), 'utf8'));
      expect(manifest.total).toBe(2);
    });

    it('should handle video without URL', async () => {
      const fetchFn = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { videos: [{ id: 'v1', title: 'No URL' }] },
          }),
        });

      const client = createTikTokClient({ fetchFn });
      const result = await client.downloadVideos({ keyword: 'test' });

      expect(result.total).toBe(1);
      expect(result.downloaded).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should throw on API listing error', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      const client = createTikTokClient({ fetchFn });
      await expect(client.downloadVideos({ keyword: 'test' })).rejects.toThrow('TikTok Creative API error: 403');
    });

    it('should use fallback url field', async () => {
      const fetchFn = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { videos: [{ id: 'v1', url: 'https://example.com/fallback.mp4' }] },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => Buffer.from('video-data').buffer,
        });

      const client = createTikTokClient({ fetchFn });
      const result = await client.downloadVideos({ keyword: 'test' });

      expect(result.downloaded).toBe(1);
    });

    it('should save metadata JSON for each video', async () => {
      const fetchFn = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              videos: [{ id: 'v1', title: 'Test Video', duration: 30, video_url: 'https://example.com/v1.mp4' }],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => Buffer.from('video').buffer,
        });

      const client = createTikTokClient({ fetchFn });
      await client.downloadVideos({ keyword: 'test' });

      const downloadDir = path.join(tmpDir, '.aios', 'squad-runs', 'test-run-001', 'spy-downloads', 'tiktok');
      const metaPath = path.join(downloadDir, 'video-v1.meta.json');
      expect(fs.existsSync(metaPath)).toBe(true);

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      expect(meta.title).toBe('Test Video');
      expect(meta.duration).toBe(30);
    });

    it('should use default download dir when no runId', () => {
      const client = new TikTokCreativeClient({
        accessToken: 'token',
        baseDir: tmpDir,
        fetchFn: jest.fn(),
        runId: null,
      });
      const dir = client._getDownloadDir();
      expect(dir).toBe(path.join(tmpDir, '.aios', 'spy-downloads', 'tiktok'));
    });
  });
});

// ─── Graceful Degradation ───────────────────────────────────────────────────

describe('Graceful Degradation', () => {
  describe('withGracefulDegradation()', () => {
    it('should return result on success', async () => {
      const result = await withGracefulDegradation(
        async () => ({ data: 'success' }),
        { stepId: 'test' }
      );
      expect(result).toEqual({ data: 'success' });
    });

    it('should return skip marker on failure when enabled', async () => {
      const result = await withGracefulDegradation(
        async () => { throw new Error('Total failure'); },
        { stepId: 'test-step', enabled: true }
      );

      expect(result.__skipped).toBe(true);
      expect(result.stepId).toBe('test-step');
      expect(result.reason).toBe('all_retries_exhausted');
      expect(result.error).toBe('Total failure');
    });

    it('should throw when disabled', async () => {
      await expect(
        withGracefulDegradation(
          async () => { throw new Error('Failure'); },
          { stepId: 'test', enabled: false }
        )
      ).rejects.toThrow('Failure');
    });

    it('should emit step.skipped event when eventStore provided', async () => {
      const eventStore = { append: jest.fn() };

      await withGracefulDegradation(
        async () => { throw new Error('API down'); },
        { stepId: 'img-step', eventStore, runId: 'run-1', enabled: true }
      );

      expect(eventStore.append).toHaveBeenCalledWith('run-1', 'step.skipped', expect.objectContaining({
        stepId: 'img-step',
        reason: 'all_retries_exhausted',
        error_message: 'API down',
      }));
    });

    it('should not throw if eventStore.append fails', async () => {
      const eventStore = { append: jest.fn().mockImplementation(() => { throw new Error('store fail'); }) };

      const result = await withGracefulDegradation(
        async () => { throw new Error('API down'); },
        { stepId: 'step', eventStore, runId: 'run-1', enabled: true }
      );

      expect(result.__skipped).toBe(true);
    });

    it('should default enabled to true', async () => {
      const result = await withGracefulDegradation(
        async () => { throw new Error('fail'); },
        { stepId: 'test' }
      );
      expect(result.__skipped).toBe(true);
    });
  });

  describe('isSkippedResult()', () => {
    it('should return true for skip markers', () => {
      expect(isSkippedResult({ __skipped: true })).toBe(true);
    });

    it('should return false for normal results', () => {
      expect(isSkippedResult({ data: 'ok' })).toBeFalsy();
      expect(isSkippedResult(null)).toBeFalsy();
      expect(isSkippedResult(undefined)).toBeFalsy();
      expect(isSkippedResult({ __skipped: false })).toBeFalsy();
    });
  });
});
