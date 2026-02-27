/**
 * Pure Task: upload-creatives
 *
 * Sprint 5 D.2: Uploads creative assets from squad-copy to Meta Ads.
 *
 * Input: { offerId, batchDir, creatives[], linkUrl }
 * Output: { uploaded[], failed[], summary }
 *
 * @module squads/media-squad/tasks/upload-creatives
 */

const { MetaAdsService } = require('../../../services/meta-ads-service');
const fs = require('fs').promises;
const path = require('path');

/**
 * Upload creatives to Meta Ads
 *
 * @param {Object} input
 * @param {string} input.offerId - Offer ID for asset lookup
 * @param {string} [input.batchDir] - Specific batch directory
 * @param {Array} [input.creatives] - Array of creative specs to upload
 * @param {string} [input.linkUrl] - Destination URL for ads
 * @returns {Promise<Object>} Upload results
 */
async function uploadCreatives(input = {}) {
  const metaAds = new MetaAdsService();
  const { offerId, batchDir, creatives = [], linkUrl } = input;

  const result = {
    success: true,
    uploadedAt: new Date().toISOString(),
    offerId,
    uploaded: [],
    failed: [],
  };

  // If no creatives provided, scan batch directory
  let creativesToUpload = creatives;

  if (creativesToUpload.length === 0 && batchDir) {
    creativesToUpload = await scanBatchDirectory(batchDir);
  }

  if (creativesToUpload.length === 0 && offerId) {
    // Try to find latest batch in offer assets
    const offerAssetsDir = path.join(
      process.cwd(), 'data', 'offers', offerId, 'assets', 'criativos'
    );
    creativesToUpload = await findLatestBatch(offerAssetsDir);
  }

  if (creativesToUpload.length === 0) {
    return {
      ...result,
      success: false,
      error: 'No creatives found to upload',
    };
  }

  // Upload each creative
  for (const creative of creativesToUpload) {
    try {
      const uploaded = await metaAds.uploadCreative({
        imagePath: creative.path,
        name: creative.name || path.basename(creative.path, path.extname(creative.path)),
        headline: creative.headline || '',
        description: creative.description || '',
        linkUrl: linkUrl || creative.linkUrl || 'https://example.com',
        callToAction: creative.cta || 'LEARN_MORE',
      });

      result.uploaded.push({
        creativeId: uploaded.id,
        name: creative.name || path.basename(creative.path),
        path: creative.path,
      });
    } catch (error) {
      result.failed.push({
        name: creative.name || path.basename(creative.path),
        path: creative.path,
        error: error.message,
      });
    }
  }

  result.summary = {
    total: creativesToUpload.length,
    uploaded: result.uploaded.length,
    failed: result.failed.length,
  };

  return result;
}

/**
 * Scan a batch directory for image files
 */
async function scanBatchDirectory(batchDir) {
  try {
    const files = await fs.readdir(batchDir);
    const imageFiles = files.filter(f =>
      /\.(png|jpg|jpeg|webp)$/i.test(f)
    );

    return imageFiles.map(f => ({
      path: path.join(batchDir, f),
      name: path.basename(f, path.extname(f)),
    }));
  } catch {
    return [];
  }
}

/**
 * Find the latest batch directory in offer assets
 */
async function findLatestBatch(assetsDir) {
  try {
    const batches = await fs.readdir(assetsDir);
    const sorted = batches.sort().reverse();

    if (sorted.length === 0) return [];

    const latestBatch = path.join(assetsDir, sorted[0]);
    return await scanBatchDirectory(latestBatch);
  } catch {
    return [];
  }
}

module.exports = uploadCreatives;
