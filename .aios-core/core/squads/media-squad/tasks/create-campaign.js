/**
 * Pure Task: create-campaign
 *
 * Sprint 5 D.2: Creates a Meta Ads campaign with ad sets and ads
 * using creatives from squad-copy output.
 *
 * Input: { offerName, objective, dailyBudget, targeting, creatives[] }
 * Output: { campaignId, adSetId, ads[], status }
 *
 * @module squads/media-squad/tasks/create-campaign
 */

const { MetaAdsService } = require('../../../services/meta-ads-service');

/**
 * Create a campaign with ad sets and ads
 *
 * @param {Object} input
 * @param {string} input.offerName - Offer name for naming convention
 * @param {string} [input.objective='conversions'] - Campaign objective
 * @param {number} input.dailyBudget - Daily budget in cents
 * @param {Object} input.targeting - Meta targeting spec
 * @param {Array} [input.creatives] - Creative assets to use
 * @param {string} [input.linkUrl] - Destination URL
 * @returns {Promise<Object>} Created campaign structure
 */
async function createCampaign(input = {}) {
  const metaAds = new MetaAdsService();
  const {
    offerName,
    objective = 'conversions',
    dailyBudget,
    targeting,
    creatives = [],
    linkUrl,
  } = input;

  if (!offerName) {
    throw new Error('offerName is required');
  }
  if (!dailyBudget) {
    throw new Error('dailyBudget is required');
  }

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const result = {
    success: true,
    createdAt: new Date().toISOString(),
    campaignId: null,
    adSetId: null,
    ads: [],
  };

  // Step 1: Create campaign
  const campaign = await metaAds.createCampaign({
    name: `[B2G] ${offerName} - ${objective} - ${timestamp}`,
    objective,
    status: 'PAUSED',
  });
  result.campaignId = campaign.id;

  // Step 2: Create ad set
  const adSet = await metaAds.createAdSet({
    campaignId: campaign.id,
    name: `[B2G] ${offerName} - AdSet - ${timestamp}`,
    targeting: targeting || {
      geo_locations: { countries: ['BR'] },
      age_min: 25,
      age_max: 65,
    },
    dailyBudget,
  });
  result.adSetId = adSet.id;

  // Step 3: Create ads from creatives
  for (let i = 0; i < creatives.length; i++) {
    const creative = creatives[i];

    try {
      // Upload creative if it has an image path
      let creativeId = creative.creativeId;

      if (!creativeId && creative.imagePath) {
        const uploaded = await metaAds.uploadCreative({
          imagePath: creative.imagePath,
          name: `[B2G] ${offerName} - Creative ${i + 1}`,
          headline: creative.headline || offerName,
          description: creative.description || '',
          linkUrl: linkUrl || creative.linkUrl || 'https://example.com',
          callToAction: creative.cta || 'LEARN_MORE',
        });
        creativeId = uploaded.id;
      }

      if (creativeId) {
        const ad = await metaAds.createAd({
          adSetId: adSet.id,
          creativeId,
          name: `[B2G] ${offerName} - Ad ${i + 1} - ${timestamp}`,
          status: 'PAUSED',
        });

        result.ads.push({
          adId: ad.id,
          creativeId,
          name: creative.name || `Ad ${i + 1}`,
          status: 'PAUSED',
        });
      }
    } catch (error) {
      result.ads.push({
        adId: null,
        creativeIndex: i,
        error: error.message,
        status: 'failed',
      });
    }
  }

  return result;
}

module.exports = createCampaign;
