/**
 * Meta Ads Service
 *
 * Sprint 5 D.4: External API Service for Meta Ads
 *
 * Provides programmatic access to Meta (Facebook) Ads API for:
 * - Campaign creation and management
 * - Ad set and ad creation
 * - Creative upload
 * - Performance metrics retrieval
 * - Budget management
 *
 * Env vars required:
 *   META_ADS_ACCESS_TOKEN - Long-lived access token
 *   META_ADS_ACCOUNT_ID   - Ad account ID (act_XXXX)
 *   META_ADS_APP_ID       - Facebook App ID
 *   META_ADS_APP_SECRET   - Facebook App Secret
 *
 * @module core/services/meta-ads-service
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const META_API_VERSION = 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

const CAMPAIGN_OBJECTIVES = {
  conversions: 'OUTCOME_SALES',
  traffic: 'OUTCOME_TRAFFIC',
  engagement: 'OUTCOME_ENGAGEMENT',
  leads: 'OUTCOME_LEADS',
  awareness: 'OUTCOME_AWARENESS',
};

const AD_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DELETED: 'DELETED',
  ARCHIVED: 'ARCHIVED',
};

// ═══════════════════════════════════════════════════════════════════════════════
//                              SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class MetaAdsService {
  /**
   * @param {Object} [options]
   * @param {string} [options.accessToken] - Meta access token
   * @param {string} [options.accountId] - Default ad account ID (can be overridden per call)
   * @param {string} [options.appId] - Facebook App ID
   * @param {string} [options.appSecret] - Facebook App Secret
   */
  constructor(options = {}) {
    this.accessToken = options.accessToken || process.env.META_ADS_ACCESS_TOKEN;
    this.accountId = options.accountId || process.env.META_ADS_ACCOUNT_ID;
    this.appId = options.appId || process.env.META_ADS_APP_ID;
    this.appSecret = options.appSecret || process.env.META_ADS_APP_SECRET;
    this.pageId = options.pageId || process.env.META_ADS_PAGE_ID;
  }

  /**
   * Resolve account ID — per-call override or default
   * @param {string} [accountId] - Override account ID
   * @returns {string} Resolved account ID (with act_ prefix)
   */
  _resolveAccountId(accountId) {
    const id = accountId || this.accountId;
    if (!id) throw new Error('No account ID provided and META_ADS_ACCOUNT_ID not configured');
    // Ensure act_ prefix
    return id.startsWith('act_') ? id : `act_${id}`;
  }

  /**
   * List all ad accounts accessible by the current access token
   *
   * @returns {Promise<Object>} List of ad accounts
   */
  async listAccounts() {
    const result = await this._apiGet('me/adaccounts', {
      fields: 'name,account_id,account_status,currency,business_name,amount_spent',
    });
    return Array.isArray(result) ? result : (result.data || [result]);
  }

  /**
   * List Facebook pages accessible by the current access token
   * @returns {Promise<Array>} List of pages
   */
  async listPages() {
    const result = await this._apiGet('me/accounts', {
      fields: 'name,id,category,is_published',
    });
    return Array.isArray(result) ? result : (result.data || [result]);
  }

  /**
   * List pixels for an ad account
   * @param {string} [accountId] - Override account ID
   * @returns {Promise<Array>} List of pixels
   */
  async listPixels(accountId) {
    const acctId = this._resolveAccountId(accountId);
    const result = await this._apiGet(`${acctId}/adspixels`, {
      fields: 'name,id,last_fired_time,is_created_by_business',
    });
    return Array.isArray(result) ? result : (result.data || [result]);
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Create a new campaign
   *
   * @param {Object} params
   * @param {string} params.name - Campaign name
   * @param {string} params.objective - Campaign objective key
   * @param {number} [params.dailyBudget] - Daily budget in cents
   * @param {number} [params.lifetimeBudget] - Lifetime budget in cents
   * @param {string} [params.status='PAUSED'] - Initial status
   * @param {string} [params.accountId] - Override account ID
   * @returns {Promise<Object>} Created campaign
   */
  async createCampaign(params) {
    const {
      name, objective, dailyBudget, lifetimeBudget,
      status = 'PAUSED', accountId, bidStrategy,
    } = params;
    const acctId = this._resolveAccountId(accountId);

    const body = {
      name,
      objective: CAMPAIGN_OBJECTIVES[objective] || objective,
      status,
      special_ad_categories: [],
    };

    if (dailyBudget) body.daily_budget = dailyBudget;
    if (lifetimeBudget) body.lifetime_budget = lifetimeBudget;
    if (bidStrategy) body.bid_strategy = bidStrategy;

    return await this._apiPost(`${acctId}/campaigns`, body);
  }

  /**
   * Get campaign performance metrics
   *
   * @param {string} campaignId
   * @param {Object} [options]
   * @param {string} [options.datePreset='last_7d']
   * @param {string[]} [options.fields]
   * @returns {Promise<Object>} Campaign insights
   */
  async getCampaignInsights(campaignId, options = {}) {
    const datePreset = options.datePreset || 'last_7d';
    const fields = options.fields || [
      'campaign_name', 'impressions', 'clicks', 'spend',
      'cpc', 'cpm', 'ctr', 'actions', 'cost_per_action_type',
      'reach', 'frequency',
    ];

    return await this._apiGet(`${campaignId}/insights`, {
      date_preset: datePreset,
      fields: fields.join(','),
    });
  }

  /**
   * Update campaign status (pause, activate, etc.)
   *
   * @param {string} campaignId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateCampaign(campaignId, updates) {
    return await this._apiPost(campaignId, updates);
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          AD SETS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Create an ad set
   *
   * @param {Object} params
   * @param {string} params.campaignId - Parent campaign ID
   * @param {string} params.name - Ad set name
   * @param {Object} params.targeting - Targeting spec
   * @param {number} params.dailyBudget - Daily budget in cents
   * @param {string} [params.billingEvent='IMPRESSIONS']
   * @param {string} [params.optimizationGoal='OFFSITE_CONVERSIONS']
   * @param {string} [params.accountId] - Override account ID
   * @returns {Promise<Object>}
   */
  async createAdSet(params) {
    const {
      campaignId, name, targeting, dailyBudget,
      billingEvent = 'IMPRESSIONS',
      optimizationGoal = 'OFFSITE_CONVERSIONS',
      accountId, bidAmount, promotedObject, status = 'PAUSED',
    } = params;
    const acctId = this._resolveAccountId(accountId);

    const body = {
      campaign_id: campaignId,
      name,
      targeting,
      billing_event: billingEvent,
      optimization_goal: optimizationGoal,
      status,
    };

    // dailyBudget is optional for CBO campaigns (budget at campaign level)
    if (dailyBudget) body.daily_budget = dailyBudget;
    if (bidAmount) body.bid_amount = bidAmount;
    if (promotedObject) body.promoted_object = promotedObject;

    return await this._apiPost(`${acctId}/adsets`, body);
  }

  /**
   * List ad sets for a campaign
   *
   * @param {string} campaignId - Campaign ID
   * @param {Object} [options]
   * @param {string[]} [options.fields] - Fields to retrieve
   * @returns {Promise<Array>} List of ad sets
   */
  async listAdSets(campaignId, options = {}) {
    const fields = options.fields || [
      'name', 'id', 'status', 'bid_amount', 'daily_budget',
    ];
    const result = await this._apiGet(`${campaignId}/adsets`, {
      fields: fields.join(','),
    });
    return Array.isArray(result) ? result : (result.data || [result]);
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          ADS & CREATIVES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Upload a creative image and create an ad creative
   *
   * @param {Object} params
   * @param {string} params.imagePath - Local path to image file
   * @param {string} params.name - Creative name
   * @param {string} params.headline - Ad headline
   * @param {string} params.description - Ad description
   * @param {string} params.linkUrl - Destination URL
   * @param {string} [params.callToAction='LEARN_MORE']
   * @param {string} [params.accountId] - Override account ID
   * @returns {Promise<Object>} Created creative
   */
  async uploadCreative(params) {
    const {
      imagePath, name, headline, description, message,
      linkUrl, callToAction = 'LEARN_MORE',
      accountId, pageId, urlTags,
    } = params;
    const acctId = this._resolveAccountId(accountId);
    const resolvedPageId = pageId || this.pageId;

    if (!resolvedPageId) {
      throw new Error('No page ID provided and META_ADS_PAGE_ID not configured');
    }

    // Step 1: Upload image
    const imageHash = await this._uploadImage(imagePath, acctId);

    // Step 2: Create ad creative
    const creativeBody = {
      name,
      object_story_spec: {
        page_id: resolvedPageId,
        link_data: {
          image_hash: imageHash,
          link: linkUrl,
          message: message || description,
          name: headline,
          description,
          call_to_action: {
            type: callToAction,
            value: { link: linkUrl },
          },
        },
      },
    };

    // URL tracking params go in url_tags (separate from link)
    if (urlTags) creativeBody.url_tags = urlTags;

    const result = await this._apiPost(`${acctId}/adcreatives`, creativeBody);
    result.imageHash = imageHash;
    return result;
  }

  /**
   * Upload a video and create a video ad creative
   *
   * @param {Object} params
   * @param {string} params.videoPath - Local path to video file (.mp4, .mov)
   * @param {string} params.name - Creative name
   * @param {string} [params.headline] - Video title
   * @param {string} [params.description] - Ad description
   * @param {string} [params.message] - Primary text
   * @param {string} params.linkUrl - Destination URL
   * @param {string} [params.callToAction='LEARN_MORE']
   * @param {string} [params.accountId] - Override account ID
   * @param {string} [params.pageId] - Override page ID
   * @param {string} [params.urlTags] - URL tracking params
   * @returns {Promise<Object>} Created creative with videoId
   */
  async uploadVideoCreative(params) {
    const {
      videoPath, name, headline, description, message,
      linkUrl, callToAction = 'LEARN_MORE',
      accountId, pageId, urlTags,
    } = params;
    const acctId = this._resolveAccountId(accountId);
    const resolvedPageId = pageId || this.pageId;

    if (!resolvedPageId) {
      throw new Error('No page ID provided and META_ADS_PAGE_ID not configured');
    }

    // Step 1: Upload video file
    const videoId = await this._uploadVideo(videoPath, acctId, name);

    // Step 2: Wait for video processing and get thumbnail
    const thumbnailUrl = await this._waitForVideoReady(videoId);

    // Step 3: Create ad creative with video_data + thumbnail
    const creativeBody = {
      name,
      object_story_spec: {
        page_id: resolvedPageId,
        video_data: {
          video_id: videoId,
          image_url: thumbnailUrl,
          title: headline || name,
          message: message || description || '',
          call_to_action: {
            type: callToAction,
            value: { link: linkUrl },
          },
        },
      },
    };

    if (urlTags) creativeBody.url_tags = urlTags;

    const result = await this._apiPost(`${acctId}/adcreatives`, creativeBody);
    result.videoId = videoId;
    return result;
  }

  /**
   * Create an ad
   *
   * @param {Object} params
   * @param {string} params.adSetId - Parent ad set ID
   * @param {string} params.creativeId - Creative ID
   * @param {string} params.name - Ad name
   * @param {string} [params.status='PAUSED']
   * @param {string} [params.accountId] - Override account ID
   * @returns {Promise<Object>}
   */
  async createAd(params) {
    const { adSetId, creativeId, name, status = 'PAUSED', accountId, trackingSpecs } = params;
    const acctId = this._resolveAccountId(accountId);

    const body = {
      name,
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      status,
    };

    if (trackingSpecs) body.tracking_specs = trackingSpecs;

    return await this._apiPost(`${acctId}/ads`, body);
  }

  /**
   * Pause an ad
   *
   * @param {string} adId
   * @returns {Promise<Object>}
   */
  async pauseAd(adId) {
    return await this._apiPost(adId, { status: AD_STATUS.PAUSED });
  }

  /**
   * Activate an ad
   *
   * @param {string} adId
   * @returns {Promise<Object>}
   */
  async activateAd(adId) {
    return await this._apiPost(adId, { status: AD_STATUS.ACTIVE });
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          PERFORMANCE DATA
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get account-level performance metrics
   *
   * @param {Object} [options]
   * @param {string} [options.datePreset='last_7d']
   * @param {string} [options.timeIncrement='1'] - Day granularity
   * @returns {Promise<Object>} Account insights
   */
  async getAccountInsights(options = {}) {
    const datePreset = options.datePreset || 'last_7d';
    const acctId = this._resolveAccountId(options.accountId);
    const fields = [
      'account_name', 'impressions', 'clicks', 'spend',
      'cpc', 'cpm', 'ctr', 'actions', 'cost_per_action_type',
      'reach', 'frequency',
    ];

    return await this._apiGet(`${acctId}/insights`, {
      date_preset: datePreset,
      fields: fields.join(','),
      time_increment: options.timeIncrement || '1',
    });
  }

  /**
   * Get ad-level performance for a campaign
   *
   * @param {string} campaignId
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async getAdPerformance(campaignId, options = {}) {
    const datePreset = options.datePreset || 'last_7d';
    const fields = [
      'ad_name', 'ad_id', 'impressions', 'clicks', 'spend',
      'cpc', 'ctr', 'actions', 'cost_per_action_type',
    ];

    return await this._apiGet(`${campaignId}/insights`, {
      date_preset: datePreset,
      fields: fields.join(','),
      level: 'ad',
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          BUDGET MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Scale an ad set budget
   *
   * @param {string} adSetId
   * @param {number} newDailyBudget - New daily budget in cents
   * @returns {Promise<Object>}
   */
  async scaleBudget(adSetId, newDailyBudget) {
    return await this._apiPost(adSetId, {
      daily_budget: newDailyBudget,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Check if service is properly configured
   *
   * @returns {Promise<Object>} Health status
   */
  async healthCheck(accountId) {
    if (!this.accessToken) {
      return { healthy: false, error: 'META_ADS_ACCESS_TOKEN not configured' };
    }

    // Account ID is optional for health check — can list accounts instead
    const acctId = accountId || this.accountId;
    if (!acctId) {
      // No default account — try listing accounts
      try {
        const accounts = await this.listAccounts();
        return {
          healthy: true,
          mode: 'multi-account',
          accountsAccessible: accounts.length,
          accounts: accounts.map(a => ({
            id: a.account_id,
            name: a.name,
            status: a.account_status,
          })),
        };
      } catch (error) {
        return { healthy: false, error: error.message };
      }
    }

    try {
      const resolvedId = this._resolveAccountId(acctId);
      const result = await this._apiGet(resolvedId, {
        fields: 'name,account_status,currency',
      });

      return {
        healthy: true,
        accountName: result.name,
        accountStatus: result.account_status,
        currency: result.currency,
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          TOKEN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Exchange a short-lived token for a long-lived token (60 days)
   *
   * Uses Meta's OAuth endpoint:
   * GET /oauth/access_token?grant_type=fb_exchange_token&
   *     client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={TOKEN}
   *
   * @param {string} [shortLivedToken] - Token to exchange (defaults to this.accessToken)
   * @returns {Promise<Object>} { access_token, token_type, expires_in }
   */
  async exchangeToken(shortLivedToken) {
    const token = shortLivedToken || this.accessToken;
    if (!token) throw new Error('No access token provided');
    if (!this.appId) throw new Error('META_ADS_APP_ID not configured');
    if (!this.appSecret) throw new Error('META_ADS_APP_SECRET not configured');

    const url = new URL(`${META_API_BASE}/oauth/access_token`);
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', this.appId);
    url.searchParams.set('client_secret', this.appSecret);
    url.searchParams.set('fb_exchange_token', token);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
      throw new Error(`Meta Token Exchange Error: ${data.error.message} (code: ${data.error.code})`);
    }

    const expiresInDays = data.expires_in ? Math.round(data.expires_in / 86400) : 'unknown';
    return {
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      expires_in: data.expires_in,
      expires_in_days: expiresInDays,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          PRIVATE: API CALLS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Make a GET request to Meta API
   * @private
   */
  async _apiGet(endpoint, params = {}) {
    const url = new URL(`${META_API_BASE}/${endpoint}`);
    url.searchParams.set('access_token', this.accessToken);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
      throw new Error(`Meta API Error: ${data.error.message} (code: ${data.error.code})`);
    }

    return data.data || data;
  }

  /**
   * Make a POST request to Meta API
   * @private
   */
  async _apiPost(endpoint, body = {}) {
    const url = `${META_API_BASE}/${endpoint}`;

    const formBody = new URLSearchParams();
    formBody.set('access_token', this.accessToken);
    for (const [key, value] of Object.entries(body)) {
      formBody.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    });

    const data = await res.json();

    if (data.error) {
      throw new Error(`Meta API Error: ${data.error.message} (code: ${data.error.code})`);
    }

    return data;
  }

  /**
   * Upload an image to Meta
   * @private
   */
  async _uploadImage(imagePath, accountId) {
    // Read file as base64
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const acctId = accountId || this._resolveAccountId();

    const result = await this._apiPost(`${acctId}/adimages`, {
      bytes: base64Image,
    });

    // Extract hash from response
    const images = result.images || {};
    const firstImage = Object.values(images)[0];
    if (!firstImage || !firstImage.hash) {
      throw new Error('Image upload failed: no hash returned');
    }

    return firstImage.hash;
  }

  /**
   * Wait for video processing to complete and return the preferred thumbnail URL.
   *
   * Meta processes videos asynchronously after upload. This polls the video status
   * every 5 seconds until processing is complete (max 5 minutes), then returns
   * the preferred thumbnail URI for use as the ad creative thumbnail.
   *
   * @param {string} videoId - Meta video ID
   * @param {number} [maxWaitMs=300000] - Max wait time (default 5 min)
   * @returns {Promise<string>} Preferred thumbnail URL
   * @private
   */
  async _waitForVideoReady(videoId, maxWaitMs = 300000) {
    const start = Date.now();
    const pollInterval = 5000;

    while (Date.now() - start < maxWaitMs) {
      const data = await this._apiGet(videoId, {
        fields: 'status,thumbnails',
      });

      const status = data.status?.processing_phase?.status;
      if (status === 'complete') {
        // Get preferred thumbnail
        const thumbnails = data.thumbnails?.data || [];
        const preferred = thumbnails.find(t => t.is_preferred) || thumbnails[0];
        if (preferred?.uri) {
          return preferred.uri;
        }
        // Fallback: use picture field
        const pictureData = await this._apiGet(videoId, { fields: 'picture' });
        if (pictureData.picture) return pictureData.picture;

        throw new Error('Video processed but no thumbnail available');
      }

      if (status === 'error') {
        throw new Error(`Video processing failed for ${videoId}`);
      }

      // Still processing — wait and retry
      await new Promise(r => setTimeout(r, pollInterval));
    }

    throw new Error(`Video processing timeout after ${maxWaitMs / 1000}s for ${videoId}`);
  }

  /**
   * Upload a video to Meta via multipart form data
   *
   * Meta's advideos endpoint requires multipart/form-data with the video file
   * in the 'source' field. Videos are processed asynchronously — the creative
   * can be created immediately but the ad won't serve until processing completes.
   *
   * @param {string} videoPath - Absolute path to video file
   * @param {string} accountId - Ad account ID (with act_ prefix)
   * @param {string} [title] - Video title
   * @returns {Promise<string>} Video ID
   * @private
   */
  async _uploadVideo(videoPath, accountId, title) {
    const { Blob } = require('buffer');
    const videoBuffer = await fs.readFile(videoPath);
    const filename = path.basename(videoPath);
    const acctId = accountId || this._resolveAccountId();

    const blob = new Blob([videoBuffer]);
    const formData = new FormData();
    formData.set('access_token', this.accessToken);
    formData.set('title', title || filename);
    formData.set('source', blob, filename);

    const url = `${META_API_BASE}/${acctId}/advideos`;

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (data.error) {
      throw new Error(`Meta API Error (video upload): ${data.error.message} (code: ${data.error.code})`);
    }

    if (!data.id) {
      throw new Error('Video upload failed: no video ID returned');
    }

    return data.id;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  MetaAdsService,
  CAMPAIGN_OBJECTIVES,
  AD_STATUS,
  META_API_VERSION,
};
