/**
 * TikTokCreativeClient — Download creative videos from TikTok Creative Center.
 *
 * Features:
 * - Search and download creative videos
 * - Concurrency control via semaphore (max 5 simultaneous)
 * - Save raw media to `.aios/squad-runs/{runId}/spy-downloads/`
 *
 * Story 2.5: External API Integrations (AC6)
 *
 * @module tiktok-creative-client
 */

const fs = require('fs');
const path = require('path');
const { ConfigError } = require('../image-generators/providers/dall-e');
const { APIErrorLogger } = require('../api-error-logger');
const { Semaphore } = require('./semaphore');

class TikTokCreativeClient {
  /**
   * @param {Object} options
   * @param {string} options.accessToken - TikTok Creative Center access token
   * @param {string} [options.runId] - Run ID for file storage
   * @param {string} [options.baseDir] - Base directory (default: process.cwd())
   * @param {number} [options.maxConcurrency=5] - Max simultaneous downloads
   * @param {APIErrorLogger} [options.errorLogger] - Error logger
   * @param {Function} [options.fetchFn] - Custom fetch function (for testing)
   */
  constructor(options = {}) {
    if (!options.accessToken) throw new ConfigError('TIKTOK_CREATIVE_TOKEN is required for TikTokCreativeClient');

    this.accessToken = options.accessToken;
    this.runId = options.runId || null;
    this.baseDir = options.baseDir || process.cwd();
    this.semaphore = new Semaphore(options.maxConcurrency || 5);
    this.errorLogger = options.errorLogger || new APIErrorLogger();
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.name = 'tiktok-creative';
  }

  /**
   * Download creative videos matching query.
   *
   * @param {Object} query - Search parameters
   * @param {string} query.keyword - Search keyword
   * @param {string} [query.region='US'] - Region filter
   * @param {number} [query.limit=20] - Max results
   * @param {Object} [options]
   * @returns {Promise<Object>} { total, downloaded, failed, files }
   */
  async downloadVideos(query, options = {}) {
    const listings = await this._fetchListings(query);

    if (!listings || listings.length === 0) {
      return { total: 0, downloaded: 0, failed: 0, files: [] };
    }

    const downloadDir = this._getDownloadDir();
    fs.mkdirSync(downloadDir, { recursive: true });

    const results = await Promise.all(
      listings.map(video => this._downloadWithSemaphore(video, downloadDir))
    );

    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const manifest = {
      total: listings.length,
      downloaded: succeeded.length,
      failed: failed.length,
      files: succeeded.map(r => r.file),
      errors: failed.map(r => ({ id: r.id, error: r.error })),
      query,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(downloadDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    return {
      total: manifest.total,
      downloaded: manifest.downloaded,
      failed: manifest.failed,
      files: manifest.files,
    };
  }

  /**
   * Fetch video listings from TikTok Creative Center API.
   * @private
   */
  async _fetchListings(query) {
    const { keyword, region = 'US', limit = 20 } = query;

    const response = await this.fetchFn(
      'https://business-api.tiktok.com/open_api/v1.3/creative/search/',
      {
        method: 'POST',
        headers: {
          'Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          region,
          limit,
        }),
      }
    );

    if (!response.ok) {
      const error = new Error(`TikTok Creative API error: ${response.status}`);
      error.statusCode = response.status;
      this._logError(error, 0);
      throw error;
    }

    const data = await response.json();
    return data.data?.videos || [];
  }

  /**
   * Download single video with semaphore control.
   * @private
   */
  async _downloadWithSemaphore(video, downloadDir) {
    await this.semaphore.acquire();
    try {
      return await this._downloadVideo(video, downloadDir);
    } finally {
      this.semaphore.release();
    }
  }

  /**
   * Download a single video.
   * @private
   */
  async _downloadVideo(video, downloadDir) {
    try {
      const videoId = video.id || `unknown-${Date.now()}`;
      const videoUrl = video.video_url || video.url;

      if (!videoUrl) {
        return { success: false, id: videoId, error: 'No video URL' };
      }

      const response = await this.fetchFn(videoUrl);
      if (!response.ok) {
        return { success: false, id: videoId, error: `HTTP ${response.status}` };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const filePath = path.join(downloadDir, `video-${videoId}.mp4`);
      fs.writeFileSync(filePath, buffer);

      // Save metadata
      const metaPath = path.join(downloadDir, `video-${videoId}.meta.json`);
      fs.writeFileSync(metaPath, JSON.stringify({
        id: videoId,
        title: video.title || null,
        duration: video.duration || null,
        downloaded_at: new Date().toISOString(),
      }, null, 2), 'utf8');

      return {
        success: true,
        id: videoId,
        file: { id: videoId, path: filePath, meta: metaPath },
      };
    } catch (error) {
      this._logError(error, 0);
      return { success: false, id: video.id || 'unknown', error: error.message };
    }
  }

  /**
   * Get download directory for current run.
   * @private
   */
  _getDownloadDir() {
    if (this.runId) {
      return path.join(this.baseDir, '.aios', 'squad-runs', this.runId, 'spy-downloads', 'tiktok');
    }
    return path.join(this.baseDir, '.aios', 'spy-downloads', 'tiktok');
  }

  /**
   * Log error (fire-and-forget)
   * @private
   */
  _logError(error, attempt) {
    if (!this.runId) return;
    try {
      this.errorLogger.log(this.runId, {
        provider: 'tiktok-creative',
        error_type: 'api_error',
        status_code: error.statusCode || null,
        message: error.message,
        retry_attempt: attempt,
      });
    } catch {
      // fire-and-forget
    }
  }
}

module.exports = { TikTokCreativeClient };
