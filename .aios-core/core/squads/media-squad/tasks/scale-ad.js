/**
 * Pure Task: scale-ad
 *
 * Sprint 5 D.2: Scales budget on winning ads/ad sets.
 * Used in daily-optimization pipeline.
 *
 * Input: { campaignId?, adSetId?, rules, dryRun }
 * Output: { scaled[], skipped[], summary }
 *
 * @module squads/media-squad/tasks/scale-ad
 */

const { MetaAdsService } = require('../../../services/meta-ads-service');

/**
 * Default scaling rules
 */
const DEFAULT_RULES = {
  minConversions: 3,        // Min conversions to consider scaling
  maxCPA: 3000,             // Max CPA in cents to qualify ($30)
  minROAS: 1.5,             // Min ROAS to qualify
  minCTR: 0.01,             // Min CTR (1%)
  scalePercent: 20,         // Budget increase percentage
  maxDailyBudget: 50000,    // Max daily budget in cents ($500)
  minRunDays: 2,            // Min days running before scaling
};

/**
 * Scale budget on winning ad sets
 *
 * @param {Object} input
 * @param {string} [input.campaignId] - Campaign to scan for winners
 * @param {string} [input.adSetId] - Specific ad set to scale
 * @param {number} [input.newBudget] - Explicit new budget in cents (overrides rules)
 * @param {Object} [input.rules] - Scaling rules (overrides defaults)
 * @param {boolean} [input.dryRun=false] - If true, don't actually scale
 * @returns {Promise<Object>} Scale results
 */
async function scaleAd(input = {}) {
  const metaAds = new MetaAdsService();
  const {
    campaignId,
    adSetId,
    newBudget,
    rules: customRules,
    dryRun = false,
  } = input;

  const rules = { ...DEFAULT_RULES, ...customRules };

  const result = {
    success: true,
    evaluatedAt: new Date().toISOString(),
    dryRun,
    rules,
    scaled: [],
    skipped: [],
  };

  if (adSetId && newBudget) {
    // Direct scale — explicit budget for specific ad set
    if (!dryRun) {
      try {
        await metaAds.scaleBudget(adSetId, newBudget);
        result.scaled.push({
          adSetId,
          newBudget,
          reason: 'Manual scale request',
        });
      } catch (error) {
        result.skipped.push({
          adSetId,
          reason: `Scale failed: ${error.message}`,
        });
      }
    } else {
      result.scaled.push({
        adSetId,
        newBudget,
        reason: 'Manual scale request',
        note: 'DRY RUN — would scale',
      });
    }
  } else if (campaignId) {
    // Auto-scale — evaluate campaign ads and scale winners
    const performance = await metaAds.getAdPerformance(campaignId, {
      datePreset: 'last_7d',
    });
    const ads = Array.isArray(performance) ? performance : (performance.data || []);

    // Group by ad set for budget scaling
    const adSetPerformance = groupByAdSet(ads);

    for (const [setId, adSetData] of Object.entries(adSetPerformance)) {
      const evaluation = evaluateForScaling(adSetData, rules);

      if (evaluation.shouldScale) {
        const currentBudget = adSetData.dailyBudget || rules.maxDailyBudget / 2;
        const scaledBudget = Math.min(
          Math.round(currentBudget * (1 + rules.scalePercent / 100)),
          rules.maxDailyBudget
        );

        if (scaledBudget <= currentBudget) {
          result.skipped.push({
            adSetId: setId,
            reason: 'Already at max budget',
            metrics: evaluation.metrics,
          });
          continue;
        }

        if (!dryRun) {
          try {
            await metaAds.scaleBudget(setId, scaledBudget);
            result.scaled.push({
              adSetId: setId,
              previousBudget: currentBudget,
              newBudget: scaledBudget,
              increasePercent: rules.scalePercent,
              reason: evaluation.reason,
              metrics: evaluation.metrics,
            });
          } catch (error) {
            result.skipped.push({
              adSetId: setId,
              reason: `Scale failed: ${error.message}`,
            });
          }
        } else {
          result.scaled.push({
            adSetId: setId,
            previousBudget: currentBudget,
            newBudget: scaledBudget,
            increasePercent: rules.scalePercent,
            reason: evaluation.reason,
            metrics: evaluation.metrics,
            note: 'DRY RUN — would scale',
          });
        }
      } else {
        result.skipped.push({
          adSetId: setId,
          reason: evaluation.reason,
          metrics: evaluation.metrics,
        });
      }
    }
  } else {
    return {
      ...result,
      success: false,
      error: 'Either campaignId or adSetId+newBudget is required',
    };
  }

  result.summary = {
    totalEvaluated: result.scaled.length + result.skipped.length,
    scaled: result.scaled.length,
    skipped: result.skipped.length,
    totalBudgetIncrease: result.scaled.reduce(
      (sum, s) => sum + ((s.newBudget || 0) - (s.previousBudget || 0)),
      0
    ),
    dryRun,
  };

  return result;
}

/**
 * Group ad-level performance by ad set
 */
function groupByAdSet(ads) {
  const groups = {};

  for (const ad of ads) {
    const setId = ad.adset_id || 'unknown';
    if (!groups[setId]) {
      groups[setId] = {
        adSetId: setId,
        ads: [],
        totalImpressions: 0,
        totalClicks: 0,
        totalSpend: 0,
        totalConversions: 0,
      };
    }

    const impressions = parseInt(ad.impressions || '0', 10);
    const clicks = parseInt(ad.clicks || '0', 10);
    const spend = parseFloat(ad.spend || '0') * 100;
    const conversions = (ad.actions || [])
      .filter(a => ['purchase', 'lead', 'complete_registration'].includes(a.action_type))
      .reduce((sum, a) => sum + parseInt(a.value || '0', 10), 0);

    groups[setId].ads.push(ad);
    groups[setId].totalImpressions += impressions;
    groups[setId].totalClicks += clicks;
    groups[setId].totalSpend += spend;
    groups[setId].totalConversions += conversions;
  }

  return groups;
}

/**
 * Evaluate an ad set for scaling eligibility
 */
function evaluateForScaling(adSetData, rules) {
  const { totalImpressions, totalClicks, totalSpend, totalConversions } = adSetData;

  const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const cpa = totalConversions > 0 ? totalSpend / totalConversions : Infinity;

  const metrics = {
    impressions: totalImpressions,
    clicks: totalClicks,
    spend: totalSpend,
    conversions: totalConversions,
    ctr,
    cpa,
    adsCount: adSetData.ads.length,
  };

  // Not enough conversions
  if (totalConversions < rules.minConversions) {
    return {
      shouldScale: false,
      reason: `Insufficient conversions (${totalConversions} < ${rules.minConversions})`,
      metrics,
    };
  }

  // CPA too high
  if (cpa > rules.maxCPA) {
    return {
      shouldScale: false,
      reason: `CPA ($${(cpa / 100).toFixed(2)}) above threshold ($${(rules.maxCPA / 100).toFixed(2)})`,
      metrics,
    };
  }

  // CTR too low
  if (ctr < rules.minCTR) {
    return {
      shouldScale: false,
      reason: `CTR (${(ctr * 100).toFixed(2)}%) below minimum (${(rules.minCTR * 100).toFixed(2)}%)`,
      metrics,
    };
  }

  // Winner! Eligible for scaling
  return {
    shouldScale: true,
    reason: `Winner: ${totalConversions} conversions, CPA $${(cpa / 100).toFixed(2)}, CTR ${(ctr * 100).toFixed(2)}%`,
    metrics,
  };
}

module.exports = scaleAd;
