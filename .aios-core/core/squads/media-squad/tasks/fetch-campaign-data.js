/**
 * Pure Task: fetch-campaign-data
 *
 * Sprint 5 D.2: Fetches campaign performance data from Meta Ads API.
 *
 * Input: { campaignId?, accountLevel?, datePreset? }
 * Output: { campaigns, metrics, summary }
 *
 * @module squads/media-squad/tasks/fetch-campaign-data
 */

const { MetaAdsService } = require('../../../services/meta-ads-service');

/**
 * Fetch campaign data from Meta Ads
 *
 * @param {Object} input
 * @param {string} [input.campaignId] - Specific campaign to fetch
 * @param {boolean} [input.accountLevel=false] - Fetch account-level metrics
 * @param {string} [input.datePreset='last_7d'] - Date range
 * @returns {Promise<Object>} Campaign data
 */
async function fetchCampaignData(input = {}) {
  const metaAds = new MetaAdsService();
  const datePreset = input.datePreset || 'last_7d';

  // Health check first
  const health = await metaAds.healthCheck();
  if (!health.healthy) {
    return {
      success: false,
      error: `Meta Ads not available: ${health.error}`,
      campaigns: [],
      metrics: null,
    };
  }

  const result = {
    success: true,
    fetchedAt: new Date().toISOString(),
    datePreset,
    campaigns: [],
    metrics: null,
    summary: null,
  };

  // Fetch specific campaign or account-level
  if (input.campaignId) {
    const insights = await metaAds.getCampaignInsights(input.campaignId, { datePreset });
    const adPerformance = await metaAds.getAdPerformance(input.campaignId, { datePreset });

    result.campaigns = [{
      campaignId: input.campaignId,
      insights: Array.isArray(insights) ? insights : [insights],
      ads: Array.isArray(adPerformance) ? adPerformance : [adPerformance],
    }];
  } else {
    // Account-level insights
    const accountInsights = await metaAds.getAccountInsights({ datePreset });
    result.metrics = Array.isArray(accountInsights) ? accountInsights : [accountInsights];
  }

  // Build summary
  result.summary = buildSummary(result);

  return result;
}

/**
 * Build a summary from fetched data
 */
function buildSummary(data) {
  if (data.metrics && data.metrics.length > 0) {
    const totals = data.metrics.reduce((acc, day) => ({
      spend: acc.spend + parseFloat(day.spend || 0),
      impressions: acc.impressions + parseInt(day.impressions || 0),
      clicks: acc.clicks + parseInt(day.clicks || 0),
      reach: acc.reach + parseInt(day.reach || 0),
    }), { spend: 0, impressions: 0, clicks: 0, reach: 0 });

    return {
      totalSpend: totals.spend.toFixed(2),
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalReach: totals.reach,
      avgCPC: totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : null,
      avgCTR: totals.impressions > 0
        ? ((totals.clicks / totals.impressions) * 100).toFixed(2) + '%'
        : null,
      days: data.metrics.length,
    };
  }

  return { message: 'No metrics data available for summary' };
}

module.exports = fetchCampaignData;
