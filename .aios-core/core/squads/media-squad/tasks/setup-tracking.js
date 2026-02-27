/**
 * Pure Task: setup-tracking
 *
 * Sprint 5 D.2: Sets up tracking links (RedTrack + UTM parameters)
 * for campaign attribution.
 *
 * Input: { offerId, campaignId, linkUrl, platform, utmParams }
 * Output: { trackingLinks, utmUrl, clickUrl, summary }
 *
 * @module squads/media-squad/tasks/setup-tracking
 */

const path = require('path');
const fs = require('fs').promises;
const yaml = require('js-yaml');

/**
 * Setup tracking links for a campaign
 *
 * @param {Object} input
 * @param {string} input.offerId - Offer ID
 * @param {string} [input.campaignId] - Meta campaign ID
 * @param {string} input.linkUrl - Base destination URL
 * @param {string} [input.platform='meta'] - Ad platform
 * @param {Object} [input.utmParams] - Custom UTM parameters
 * @returns {Promise<Object>} Tracking setup result
 */
async function setupTracking(input = {}) {
  const {
    offerId,
    campaignId,
    linkUrl,
    platform = 'meta',
    utmParams = {},
  } = input;

  if (!offerId) {
    throw new Error('offerId is required for setup-tracking');
  }
  if (!linkUrl) {
    throw new Error('linkUrl is required for setup-tracking');
  }

  const result = {
    success: true,
    createdAt: new Date().toISOString(),
    offerId,
    campaignId,
    platform,
  };

  // Build UTM parameters
  const utm = {
    utm_source: utmParams.utm_source || platform,
    utm_medium: utmParams.utm_medium || 'paid',
    utm_campaign: utmParams.utm_campaign || `${offerId}-${platform}`,
    utm_content: utmParams.utm_content || campaignId || 'default',
    utm_term: utmParams.utm_term || '',
  };

  // Build UTM URL
  const url = new URL(linkUrl);
  for (const [key, value] of Object.entries(utm)) {
    if (value) url.searchParams.set(key, value);
  }
  result.utmUrl = url.toString();

  // Build RedTrack click URL (if configured)
  const redTrackDomain = process.env.REDTRACK_DOMAIN;
  if (redTrackDomain) {
    const clickId = `${offerId}-${platform}-${Date.now()}`;
    result.clickUrl = `https://${redTrackDomain}/click?cid=${clickId}&url=${encodeURIComponent(result.utmUrl)}`;
    result.redTrackConfigured = true;
  } else {
    result.clickUrl = result.utmUrl;
    result.redTrackConfigured = false;
  }

  // Generate platform-specific macros
  result.trackingLinks = generatePlatformLinks(result.clickUrl, platform);

  // Save tracking config to offer directory
  const trackingDir = path.join(
    process.cwd(), 'data', 'offers', offerId, 'tracking'
  );
  await fs.mkdir(trackingDir, { recursive: true });

  const trackingConfig = {
    offerId,
    campaignId,
    platform,
    baseUrl: linkUrl,
    utmUrl: result.utmUrl,
    clickUrl: result.clickUrl,
    redTrackConfigured: result.redTrackConfigured,
    trackingLinks: result.trackingLinks,
    createdAt: result.createdAt,
  };

  await fs.writeFile(
    path.join(trackingDir, `${platform}-tracking.yaml`),
    yaml.dump(trackingConfig),
    'utf8'
  );

  result.summary = {
    platform,
    hasRedTrack: result.redTrackConfigured,
    linksGenerated: Object.keys(result.trackingLinks).length,
    configSaved: `data/offers/${offerId}/tracking/${platform}-tracking.yaml`,
  };

  return result;
}

/**
 * Generate platform-specific tracking links with dynamic macros
 */
function generatePlatformLinks(baseClickUrl, platform) {
  const links = {};

  if (platform === 'meta' || platform === 'facebook') {
    // Meta dynamic URL parameters
    links.feed = `${baseClickUrl}&placement=feed&ad_id={{ad.id}}&adset_id={{adset.id}}&campaign_id={{campaign.id}}`;
    links.stories = `${baseClickUrl}&placement=stories&ad_id={{ad.id}}&adset_id={{adset.id}}&campaign_id={{campaign.id}}`;
    links.reels = `${baseClickUrl}&placement=reels&ad_id={{ad.id}}&adset_id={{adset.id}}&campaign_id={{campaign.id}}`;
  } else if (platform === 'tiktok') {
    // TikTok dynamic parameters
    links.feed = `${baseClickUrl}&placement=feed&ad_id=__AID__&campaign_id=__CID__`;
    links.topview = `${baseClickUrl}&placement=topview&ad_id=__AID__&campaign_id=__CID__`;
  } else {
    // Generic
    links.default = baseClickUrl;
  }

  return links;
}

module.exports = setupTracking;
