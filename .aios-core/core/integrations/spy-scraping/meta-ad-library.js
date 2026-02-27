/**
 * MetaAdLibraryClient — Download ads from Meta Ad Library API.
 *
 * Features:
 * - Search and download ads
 * - Concurrency control via semaphore (max 5 simultaneous)
 * - Save raw media to `.aios/squad-runs/{runId}/spy-downloads/`
 *
 * Story 2.5: External API Integrations (AC6)
 *
 * @module meta-ad-library-client
 */

const fs = require('fs');
const path = require('path');
const { ConfigError } = require('../image-generators/providers/dall-e');
const { APIErrorLogger } = require('../api-error-logger');
const { Semaphore } = require('./semaphore');

class MetaAdLibraryClient {
  /**
   * @param {Object} options
   * @param {string} options.accessToken - Meta Ad Library access token
   * @param {string} [options.runId] - Run ID for file storage
   * @param {string} [options.baseDir] - Base directory (default: process.cwd())
   * @param {number} [options.maxConcurrency=5] - Max simultaneous downloads
   * @param {APIErrorLogger} [options.errorLogger] - Error logger
   * @param {Function} [options.fetchFn] - Custom fetch function (for testing)
   */
  constructor(options = {}) {
    if (!options.accessToken) throw new ConfigError('META_AD_LIBRARY_TOKEN is required for MetaAdLibraryClient');

    this.accessToken = options.accessToken;
    this.runId = options.runId || null;
    this.baseDir = options.baseDir || process.cwd();
    this.semaphore = new Semaphore(options.maxConcurrency || 5);
    this.errorLogger = options.errorLogger || new APIErrorLogger();
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.name = 'meta-ad-library';
  }

  /**
   * Download ads matching query.
   *
   * @param {Object} query - Search parameters
   * @param {string} query.search_terms - Keywords to search
   * @param {string} [query.ad_type='ALL'] - Ad type filter
   * @param {string} [query.country='US'] - Country code
   * @param {number} [query.limit=25] - Max results
   * @param {Object} [options]
   * @returns {Promise<Object>} { total, downloaded, failed, files }
   */
  async downloadAds(query, options = {}) {
    // Fetch ad listings
    const listings = await this._fetchListings(query);

    if (!listings || listings.length === 0) {
      return { total: 0, downloaded: 0, failed: 0, files: [] };
    }

    // Download media concurrently with semaphore
    const downloadDir = this._getDownloadDir();
    fs.mkdirSync(downloadDir, { recursive: true });

    const results = await Promise.all(
      listings.map(ad => this._downloadWithSemaphore(ad, downloadDir))
    );

    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Save manifest
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
   * Fetch ad listings from Meta Ad Library API.
   * @private
   */
  async _fetchListings(query) {
    const { search_terms, ad_type = 'ALL', country = 'US', limit = 25 } = query;

    const params = new URLSearchParams({
      access_token: this.accessToken,
      search_terms,
      ad_type,
      ad_reached_countries: country,
      limit: String(limit),
      fields: 'id,ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,page_name',
    });

    const response = await this.fetchFn(
      `https://graph.facebook.com/v18.0/ads_archive?${params.toString()}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const error = new Error(`Meta Ad Library API error: ${response.status}`);
      error.statusCode = response.status;
      this._logError(error, 0);
      throw error;
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Download single ad with semaphore control.
   * @private
   */
  async _downloadWithSemaphore(ad, downloadDir) {
    await this.semaphore.acquire();
    try {
      return await this._downloadAd(ad, downloadDir);
    } finally {
      this.semaphore.release();
    }
  }

  /**
   * Download a single ad's media.
   * @private
   */
  async _downloadAd(ad, downloadDir) {
    try {
      const adId = ad.id || `unknown-${Date.now()}`;
      const snapshotUrl = ad.ad_snapshot_url;

      if (!snapshotUrl) {
        return { success: false, id: adId, error: 'No snapshot URL' };
      }

      const response = await this.fetchFn(snapshotUrl);
      if (!response.ok) {
        return { success: false, id: adId, error: `HTTP ${response.status}` };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const filePath = path.join(downloadDir, `ad-${adId}.html`);
      fs.writeFileSync(filePath, buffer);

      // Save metadata
      const metaPath = path.join(downloadDir, `ad-${adId}.meta.json`);
      fs.writeFileSync(metaPath, JSON.stringify({
        id: adId,
        page_name: ad.page_name,
        bodies: ad.ad_creative_bodies,
        titles: ad.ad_creative_link_titles,
        downloaded_at: new Date().toISOString(),
      }, null, 2), 'utf8');

      return {
        success: true,
        id: adId,
        file: { id: adId, path: filePath, meta: metaPath },
      };
    } catch (error) {
      this._logError(error, 0);
      return { success: false, id: ad.id || 'unknown', error: error.message };
    }
  }

  /**
   * Get download directory for current run.
   * @private
   */
  _getDownloadDir() {
    if (this.runId) {
      return path.join(this.baseDir, '.aios', 'squad-runs', this.runId, 'spy-downloads', 'meta');
    }
    return path.join(this.baseDir, '.aios', 'spy-downloads', 'meta');
  }

  /**
   * Log error (fire-and-forget)
   * @private
   */
  _logError(error, attempt) {
    if (!this.runId) return;
    try {
      this.errorLogger.log(this.runId, {
        provider: 'meta-ad-library',
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

module.exports = { MetaAdLibraryClient };
