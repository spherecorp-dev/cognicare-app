/**
 * Pure Task: pause-ad
 *
 * Sprint 5 D.2: Pauses ads with high CPA or low performance.
 * Used in daily-optimization pipeline.
 *
 * Input: { adId?, campaignId?, rules, dryRun }
 * Output: { paused[], skipped[], summary }
 *
 * @module squads/media-squad/tasks/pause-ad
 */

const { MetaAdsService } = require('../../../services/meta-ads-service');

/**
 * Default optimization rules
 */
const DEFAULT_RULES = {
  maxCPA: 5000,           // Max cost per action in cents ($50)
  minImpressions: 500,    // Min impressions before evaluating
  maxSpendNoConversion: 2000, // Max spend without conversion in cents ($20)
  minCTR: 0.005,          // Min CTR (0.5%)
  minROAS: 1.0,           // Min return on ad spend
};

/**
 * Pause underperforming ads
 *
 * @param {Object} input
 * @param {string} [input.adId] - Specific ad ID to evaluate and pause
 * @param {string} [input.campaignId] - Campaign to scan for underperformers
 * @param {Object} [input.rules] - Optimization rules (overrides defaults)
 * @param {boolean} [input.dryRun=false] - If true, don't actually pause
 * @returns {Promise<Object>} Pause results
 */
async function pauseAd(input = {}) {
  const metaAds = new MetaAdsService();
  const { adId, campaignId, rules: customRules, dryRun = false } = input;

  const rules = { ...DEFAULT_RULES, ...customRules };

  const result = {
    success: true,
    evaluatedAt: new Date().toISOString(),
    dryRun,
    rules,
    paused: [],
    skipped: [],
  };

  // Get ads to evaluate
  let adsToCheck = [];

  if (adId) {
    // Single ad evaluation
    adsToCheck = [{ ad_id: adId }];
  } else if (campaignId) {
    // Get all ads in campaign with performance data
    const performance = await metaAds.getAdPerformance(campaignId, {
      datePreset: 'last_3d',
    });
    adsToCheck = Array.isArray(performance) ? performance : (performance.data || []);
  } else {
    return {
      ...result,
      success: false,
      error: 'Either adId or campaignId is required',
    };
  }

  // Evaluate each ad
  for (const ad of adsToCheck) {
    const evaluation = evaluateAd(ad, rules);

    if (evaluation.shouldPause) {
      if (!dryRun) {
        try {
          await metaAds.pauseAd(ad.ad_id);
          result.paused.push({
            adId: ad.ad_id,
            adName: ad.ad_name || 'unknown',
            reason: evaluation.reason,
            metrics: evaluation.metrics,
          });
        } catch (error) {
          result.skipped.push({
            adId: ad.ad_id,
            reason: `Pause failed: ${error.message}`,
          });
        }
      } else {
        result.paused.push({
          adId: ad.ad_id,
          adName: ad.ad_name || 'unknown',
          reason: evaluation.reason,
          metrics: evaluation.metrics,
          note: 'DRY RUN — would pause',
        });
      }
    } else {
      result.skipped.push({
        adId: ad.ad_id,
        adName: ad.ad_name || 'unknown',
        reason: 'Within acceptable limits',
        metrics: evaluation.metrics,
      });
    }
  }

  result.summary = {
    totalEvaluated: adsToCheck.length,
    paused: result.paused.length,
    kept: result.skipped.length,
    dryRun,
  };

  return result;
}

/**
 * Evaluate a single ad against optimization rules
 *
 * @param {Object} ad - Ad performance data from Meta API
 * @param {Object} rules - Optimization rules
 * @returns {Object} { shouldPause, reason, metrics }
 */
function evaluateAd(ad, rules) {
  const impressions = parseInt(ad.impressions || '0', 10);
  const clicks = parseInt(ad.clicks || '0', 10);
  const spend = parseFloat(ad.spend || '0') * 100; // Convert to cents
  const ctr = parseFloat(ad.ctr || '0');

  // Extract conversions from actions array
  const actions = ad.actions || [];
  const conversions = actions
    .filter(a => ['purchase', 'lead', 'complete_registration'].includes(a.action_type))
    .reduce((sum, a) => sum + parseInt(a.value || '0', 10), 0);

  // Extract CPA from cost_per_action_type
  const costPerAction = ad.cost_per_action_type || [];
  const cpa = costPerAction
    .filter(c => ['purchase', 'lead', 'complete_registration'].includes(c.action_type))
    .map(c => parseFloat(c.value || '0') * 100)[0] || 0; // cents

  const metrics = { impressions, clicks, spend, ctr, conversions, cpa };

  // Not enough data yet
  if (impressions < rules.minImpressions) {
    return { shouldPause: false, reason: 'Insufficient impressions', metrics };
  }

  // High CPA
  if (conversions > 0 && cpa > rules.maxCPA) {
    return {
      shouldPause: true,
      reason: `CPA ($${(cpa / 100).toFixed(2)}) exceeds max ($${(rules.maxCPA / 100).toFixed(2)})`,
      metrics,
    };
  }

  // Spending without conversions
  if (conversions === 0 && spend > rules.maxSpendNoConversion) {
    return {
      shouldPause: true,
      reason: `Spent $${(spend / 100).toFixed(2)} without conversions (max: $${(rules.maxSpendNoConversion / 100).toFixed(2)})`,
      metrics,
    };
  }

  // Low CTR
  if (ctr < rules.minCTR) {
    return {
      shouldPause: true,
      reason: `CTR (${(ctr * 100).toFixed(2)}%) below minimum (${(rules.minCTR * 100).toFixed(2)}%)`,
      metrics,
    };
  }

  return { shouldPause: false, reason: 'Performing within limits', metrics };
}

module.exports = pauseAd;
