/**
 * Campaign Builder
 *
 * Central module for creating Meta Ads campaigns from offer config + template profiles.
 * Encapsulates the proven logic from test-create-campaign.js into a reusable class.
 *
 * Flow:
 *   1. loadConfig()     → reads offer campaign-config.yaml + template, merges
 *   2. parseAdCopy()    → parses META-AD-COPY.md into structured creative data
 *   3. loadCreatives()  → matches images with ad copy by ID
 *   4. createFromOffer() → executes full creation: campaign → ad set → ads
 *   5. updateHistory()  → appends created IDs to campaign-config.yaml
 *
 * @module core/services/campaign-builder
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { MetaAdsService } = require('./meta-ads-service');

class CampaignBuilder {
  /**
   * @param {string} projectRoot - Absolute path to project root
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          CONFIG LOADING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Load and merge offer config with template profile.
   *
   * @param {string} offerId - e.g. "MEMFR02"
   * @param {string} campaignConfigId - e.g. "cbo-tdc-ww-fr"
   * @returns {Promise<Object>} { offerConfig, campaignEntry, profile, templateConfig }
   */
  async loadConfig(offerId, campaignConfigId) {
    // 1. Read offer campaign-config.yaml
    const offerDir = path.join(this.projectRoot, 'data/offers', offerId);
    const configPath = path.join(offerDir, 'campaign-config.yaml');
    const configRaw = await fs.readFile(configPath, 'utf-8');
    const offerConfig = yaml.load(configRaw);

    // 2. Find matching campaign entry
    const campaignEntry = (offerConfig.campaigns || []).find(c => c.id === campaignConfigId);
    if (!campaignEntry) {
      const available = (offerConfig.campaigns || []).map(c => c.id).join(', ');
      throw new Error(
        `Campaign config "${campaignConfigId}" not found for offer ${offerId}. Available: ${available}`
      );
    }

    // 3. Read template
    const templatePath = path.join(
      this.projectRoot, 'squads/media-squad/templates/campaign-launch-template.yaml'
    );
    const templateRaw = await fs.readFile(templatePath, 'utf-8');
    const templateConfig = yaml.load(templateRaw);

    // 4. Find matching profile
    const profileId = campaignEntry.profile;
    const profile = templateConfig.profiles?.[profileId];
    if (!profile) {
      const available = Object.keys(templateConfig.profiles || {}).join(', ');
      throw new Error(
        `Profile "${profileId}" not found in template. Available: ${available}`
      );
    }

    return { offerConfig, campaignEntry, profile, templateConfig };
  }

  /**
   * Get offer config for display (Jarvis shows to CEO before creating).
   *
   * @param {string} offerId
   * @returns {Promise<Object>} Formatted config for Jarvis
   */
  async getOfferConfig(offerId) {
    const offerDir = path.join(this.projectRoot, 'data/offers', offerId);
    const configPath = path.join(offerDir, 'campaign-config.yaml');

    try {
      const configRaw = await fs.readFile(configPath, 'utf-8');
      const config = yaml.load(configRaw);

      // Load creative info
      let creatives = [];
      if (config.creatives?.meta_copy) {
        const copyPath = path.join(offerDir, config.creatives.meta_copy);
        try {
          creatives = await this.parseAdCopy(copyPath);
        } catch { /* no creatives yet */ }
      }

      // List available batches
      const batchesDir = path.join(offerDir, 'assets/criativos/batches');
      let batches = [];
      try {
        const dirs = await fs.readdir(batchesDir);
        batches = dirs.filter(d => !d.startsWith('.')).sort().reverse();
      } catch { /* no batches dir */ }

      return {
        offerId: config.offer_id,
        offerName: config.offer_name,
        accountId: config.account_id,
        pageId: config.page_id,
        pixelId: config.pixel_id,
        linkUrl: config.link_url,
        campaigns: (config.campaigns || []).map(c => ({
          id: c.id,
          description: c.description,
          dailyBudget: c.daily_budget,
          bidAmount: c.bid_amount,
          status: c.status,
          profile: c.profile,
        })),
        creatives: {
          batchDir: config.creatives?.batch_dir,
          count: creatives.length || config.creatives?.count || 0,
          ids: creatives.map(c => c.id),
        },
        batches,
        history: config.history || [],
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Offer "${offerId}" not found or has no campaign-config.yaml`);
      }
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          AD COPY PARSING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Parse META-AD-COPY.md into structured creative data.
   *
   * Expected format per creative block (separated by ---):
   *   **ID:** STE-IMG-MEMFR02-01H00
   *   **Primary Text (Story Style):** ...
   *   **Headline:** ...
   *   **Description:** ...
   *   **CTA Button:** ...
   *   **Image:** STE-IMG-MEMFR02-01H00.png
   *
   * @param {string} copyPath - Absolute path to META-AD-COPY.md
   * @returns {Promise<Array>} Array of creative objects
   */
  async parseAdCopy(copyPath) {
    const content = await fs.readFile(copyPath, 'utf-8');
    const blocks = content.split(/^---$/m).filter(b => b.trim());
    const creatives = [];

    for (const block of blocks) {
      // Skip header/footer blocks without ID
      const idMatch = block.match(/\*\*ID:\*\*\s*(.+)/);
      if (!idMatch) continue;

      const id = idMatch[1].trim();

      // Extract primary text — everything between "Primary Text" header and next ** field
      const primaryMatch = block.match(
        /\*\*Primary Text[^*]*\*\*\s*\n([\s\S]*?)(?=\n\*\*(?:Headline|Description|CTA|Image)\*\*)/
      );
      const message = primaryMatch ? primaryMatch[1].trim() : '';

      // Extract headline
      const headlineMatch = block.match(/\*\*Headline:\*\*\s*\n?(.+)/);
      const headline = headlineMatch ? headlineMatch[1].trim() : '';

      // Extract description
      const descMatch = block.match(/\*\*Description:\*\*\s*\n?([\s\S]*?)(?=\n\*\*(?:CTA|Image)\*\*|\n---|\n#|$)/);
      const description = descMatch ? descMatch[1].trim() : '';

      // Extract CTA button text
      const ctaMatch = block.match(/\*\*CTA Button:\*\*\s*(.+)/);
      const ctaText = ctaMatch ? ctaMatch[1].trim() : '';

      // Extract image filename
      const imageMatch = block.match(/\*\*Image:\*\*\s*(.+)/);
      const imageFile = imageMatch ? imageMatch[1].trim() : `${id}.png`;

      creatives.push({
        id,
        message,
        headline,
        description,
        ctaText,
        cta: 'LEARN_MORE', // Meta API CTA type
        imageFile,
      });
    }

    return creatives;
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          CREATIVE LOADING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Load creatives: match images with ad copy, resolve file paths.
   *
   * Ad copy is now OPTIONAL. If META-AD-COPY.md is missing, scans for media files.
   * Inline ad copy can be provided via options.adCopy to override the file.
   *
   * @param {string} offerDir - Absolute path to offer directory
   * @param {Object} batchConfig - { batch_dir, images_dir, meta_copy }
   * @param {Object} [options]
   * @param {string[]} [options.creativeIds] - Filter to specific creative IDs
   * @param {string} [options.batchId] - Override batch directory
   * @param {Object} [options.adCopy] - Inline ad copy: { primary_text, headline, description }
   * @returns {Promise<Array>} Creatives with imagePath resolved
   */
  async loadCreatives(offerDir, batchConfig, options = {}) {
    // Resolve batch directory
    let batchDir;
    const configBatchDir = batchConfig?.batch_dir || batchConfig?.batchDir;
    if (options.batchId) {
      batchDir = path.join(offerDir, 'assets/criativos/batches', options.batchId);
    } else if (configBatchDir) {
      batchDir = path.join(offerDir, configBatchDir);
    } else {
      // Find latest batch
      const batchesDir = path.join(offerDir, 'assets/criativos/batches');
      const dirs = await fs.readdir(batchesDir);
      const sorted = dirs.filter(d => !d.startsWith('.')).sort().reverse();
      if (!sorted.length) throw new Error('No creative batches found');
      batchDir = path.join(batchesDir, sorted[0]);
    }

    // Parse ad copy from file OR use inline copy OR scan media files
    let adCopy = null;

    if (!options.adCopy) {
      // Try to parse META-AD-COPY.md (optional — no longer throws)
      const copyPath = path.join(batchDir, 'meta/META-AD-COPY.md');
      try {
        adCopy = await this.parseAdCopy(copyPath);
      } catch {
        // No ad copy file — will scan media files below
      }
    }

    // If no ad copy from file, scan for media files directly
    if (!adCopy || adCopy.length === 0) {
      adCopy = await this._scanMediaFiles(batchDir, options.adCopy);
    } else if (options.adCopy) {
      // File exists but inline copy provided — override copy text
      for (const creative of adCopy) {
        if (options.adCopy.primary_text) creative.message = options.adCopy.primary_text;
        if (options.adCopy.headline) creative.headline = options.adCopy.headline;
        if (options.adCopy.description) creative.description = options.adCopy.description;
      }
    }

    // Resolve image paths
    const imagesDir = path.join(batchDir, 'images');
    const creatives = [];

    for (const creative of adCopy) {
      // If imagePath already set by _scanMediaFiles, skip resolution
      if (creative.imagePath) {
        creatives.push(creative);
        continue;
      }

      const imagePath = path.join(imagesDir, creative.imageFile);

      // Check image exists
      try {
        await fs.access(imagePath);
      } catch {
        // Try alternative extensions
        const altExts = ['.png', '.jpg', '.jpeg', '.webp'];
        const baseName = creative.id;
        let found = false;
        for (const ext of altExts) {
          const altPath = path.join(imagesDir, `${baseName}${ext}`);
          try {
            await fs.access(altPath);
            creative.imagePath = altPath;
            found = true;
            break;
          } catch { /* try next */ }
        }
        if (!found) {
          creative.imagePath = null;
          creative.error = `Image not found: ${creative.imageFile}`;
        }
        if (!found) continue;
      }

      if (!creative.imagePath) {
        creative.imagePath = imagePath;
      }

      creatives.push(creative);
    }

    // Filter by creative IDs if specified
    if (options.creativeIds?.length) {
      return creatives.filter(c => options.creativeIds.includes(c.id));
    }

    return creatives;
  }

  /**
   * Scan batch directory for media files when META-AD-COPY.md is missing.
   * Creates creative entries with optional inline ad copy.
   *
   * @param {string} batchDir - Batch directory path
   * @param {Object} [inlineCopy] - Inline ad copy: { primary_text, headline, description }
   * @returns {Promise<Array>} Creatives with imagePath set
   * @private
   */
  async _scanMediaFiles(batchDir, inlineCopy = null) {
    const imagesDir = path.join(batchDir, 'images');
    const creatives = [];
    const mediaExts = ['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.mov'];

    // Helper: strip all trailing media extensions to get clean ID
    // Handles double extensions like .mp3.mp4
    const cleanId = (filename) =>
      filename.replace(/(\.(mp3|mp4|mov|avi|mkv|webm|png|jpg|jpeg|webp))+$/i, '');

    try {
      const files = await fs.readdir(imagesDir);

      for (const file of files.sort()) {
        const ext = path.extname(file).toLowerCase();
        if (!mediaExts.includes(ext)) continue;
        if (file.startsWith('.')) continue;

        const id = cleanId(file);
        creatives.push({
          id,
          message: inlineCopy?.primary_text || '',
          headline: inlineCopy?.headline || '',
          description: inlineCopy?.description || '',
          cta: 'LEARN_MORE',
          imageFile: file,
          imagePath: path.join(imagesDir, file),
        });
      }
    } catch {
      // No images directory — check for media files at batch root
      try {
        const files = await fs.readdir(batchDir);
        for (const file of files.sort()) {
          const ext = path.extname(file).toLowerCase();
          if (!mediaExts.includes(ext)) continue;
          if (file.startsWith('.')) continue;

          const id = cleanId(file);
          creatives.push({
            id,
            message: inlineCopy?.primary_text || '',
            headline: inlineCopy?.headline || '',
            description: inlineCopy?.description || '',
            cta: 'LEARN_MORE',
            imageFile: file,
            imagePath: path.join(batchDir, file),
          });
        }
      } catch { /* no media files found */ }
    }

    return creatives;
  }

  // ═══════════════════════════════════════════════════════════════════
  //                        CAMPAIGN CREATION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Create a full campaign from offer config + template profile.
   *
   * @param {Object} params
   * @param {string} params.offerId
   * @param {string} params.campaignConfigId
   * @param {number} [params.dailyBudget] - Override (cents)
   * @param {number} [params.bidAmount] - Override (cents)
   * @param {string[]} [params.creativeIds] - Filter creatives
   * @param {string} [params.batchId] - Override batch
   * @param {string} [params.accountId] - Override ad account (multi-BM support)
   * @param {Object} [params.adCopy] - Inline ad copy: { primary_text, headline, description }
   * @returns {Promise<Object>} Full creation result
   */
  async createFromOffer(params) {
    const { offerId, campaignConfigId, creativeIds, batchId } = params;

    // 1. Load config
    const { offerConfig, campaignEntry, profile, templateConfig } = await this.loadConfig(
      offerId, campaignConfigId
    );

    // 2. Resolve values (params override > campaignEntry > defaults)
    const dailyBudget = params.dailyBudget || campaignEntry.daily_budget;
    const bidAmount = params.bidAmount || campaignEntry.bid_amount;
    const accountId = params.accountId || offerConfig.account_id;
    const pageId = offerConfig.page_id;
    const pixelId = offerConfig.pixel_id;
    const linkUrl = offerConfig.link_url;
    const urlTags = templateConfig.url_tags;

    // Build campaign name from naming convention
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }).replace('/', '.');
    const naming = campaignEntry.naming || {};
    const campaignName = `${naming.type || 'CBO'} - ${naming.method || 'TDC'} - ${offerId} - ${naming.source || 'AI'} - ${date}`;
    const adSetName = `${campaignName} - AdSet`;

    // 3. Load creatives
    const offerDir = path.join(this.projectRoot, 'data/offers', offerId);
    const creatives = await this.loadCreatives(offerDir, offerConfig.creatives, {
      creativeIds,
      batchId,
      adCopy: params.adCopy,
    });

    if (!creatives.length) {
      throw new Error('No creatives found to upload. Check batch directory and image files.');
    }

    // 4. Initialize Meta service with offer-specific values
    const meta = new MetaAdsService({
      accountId,
      pageId,
    });

    // 5. Create campaign (CBO: budget at campaign level)
    const campaign = await meta.createCampaign({
      name: campaignName,
      objective: profile.campaign?.objective || 'OUTCOME_SALES',
      status: 'PAUSED',
      dailyBudget,
      bidStrategy: profile.campaign?.bid_strategy || 'LOWEST_COST_WITH_BID_CAP',
    });

    // 6. Create ad set
    const targeting = profile.ad_set?.targeting || {};
    const adSet = await meta.createAdSet({
      campaignId: campaign.id,
      name: adSetName,
      targeting,
      billingEvent: profile.ad_set?.billing_event || 'IMPRESSIONS',
      optimizationGoal: profile.ad_set?.optimization_goal || 'OFFSITE_CONVERSIONS',
      bidAmount,
      promotedObject: {
        pixel_id: pixelId,
        custom_event_type: profile.ad_set?.promoted_object?.custom_event_type || 'PURCHASE',
      },
    });

    // 7. Upload creatives and create ads (auto-detects image vs video)
    const ads = [];
    for (const creative of creatives) {
      try {
        // Upload media + create creative (image or video)
        const adCreative = await this._uploadCreative(meta, creative, { linkUrl, pageId, urlTags });

        // Create ad
        const ad = await meta.createAd({
          adSetId: adSet.id,
          creativeId: adCreative.id,
          name: creative.id,
          trackingSpecs: [{
            'action.type': ['offsite_conversion'],
            fb_pixel: [pixelId],
          }],
        });

        ads.push({
          creativeId: creative.id,
          adCreativeId: adCreative.id,
          imageHash: adCreative.imageHash,
          adId: ad.id,
          name: creative.id,
          status: 'OK',
        });
      } catch (error) {
        ads.push({
          creativeId: creative.id,
          name: creative.id,
          status: 'FAILED',
          error: error.message,
        });
      }
    }

    // 8. Build result
    const result = {
      success: true,
      campaignId: campaign.id,
      campaignName,
      adSetId: adSet.id,
      adSetName,
      ads,
      summary: {
        total: creatives.length,
        created: ads.filter(a => a.status === 'OK').length,
        failed: ads.filter(a => a.status === 'FAILED').length,
      },
      config: {
        offerId,
        profile: campaignEntry.profile,
        dailyBudget,
        bidAmount,
        pageId,
        pixelId,
        targeting: targeting.geo_locations ? 'custom' : 'default',
      },
    };

    // 9. Update history
    try {
      await this.updateHistory(offerId, {
        campaign_id: campaign.id,
        ad_set_id: adSet.id,
        profile_used: campaignEntry.profile,
        created_at: new Date().toISOString().slice(0, 10),
        name: campaignName,
        bid_amount: bidAmount,
        daily_budget: dailyBudget,
        ads_count: result.summary.created,
        status: 'paused',
      });
    } catch {
      // History update is non-critical
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════
  //                  ADD TO EXISTING CAMPAIGN
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Add creatives to an existing campaign, distributed across multiple ad sets.
   *
   * @param {Object} params
   * @param {string} params.offerId
   * @param {string} params.campaignConfigId - Profile to use for targeting/bid
   * @param {string} params.campaignId - Meta campaign ID (existing)
   * @param {string} params.campaignName - Campaign name (for ad set naming)
   * @param {number} params.adSetsCount - Number of ad sets to create
   * @param {number} [params.startIndex] - Starting index for numbering (auto if omitted)
   * @param {number} [params.bidAmount] - Override bid cap (cents)
   * @param {string[]} [params.creativeIds] - Filter specific creative IDs
   * @param {string} [params.batchId] - Override batch directory
   * @param {string} [params.accountId] - Override ad account (multi-BM support)
   * @param {Object} [params.adCopy] - Inline ad copy: { primary_text, headline, description }
   * @returns {Promise<Object>} Creation result
   */
  async addToExistingCampaign(params) {
    const {
      offerId, campaignConfigId, campaignId, campaignName,
      adSetsCount, creativeIds, batchId,
    } = params;

    // 1. Load config
    const { offerConfig, campaignEntry, profile, templateConfig } =
      await this.loadConfig(offerId, campaignConfigId);

    // 2. Resolve values
    const bidAmount = params.bidAmount || campaignEntry.bid_amount;
    const accountId = params.accountId || offerConfig.account_id;
    const pageId = offerConfig.page_id;
    const pixelId = offerConfig.pixel_id;
    const linkUrl = offerConfig.link_url;
    const urlTags = templateConfig.url_tags;

    // 3. Load creatives
    const offerDir = path.join(this.projectRoot, 'data/offers', offerId);
    const creatives = await this.loadCreatives(offerDir, offerConfig.creatives, {
      creativeIds,
      batchId,
      adCopy: params.adCopy,
    });

    if (!creatives.length) {
      throw new Error('No creatives found to upload.');
    }
    if (adSetsCount < 1) {
      throw new Error('adSetsCount must be at least 1.');
    }

    // 4. Chunk creatives across ad sets
    const chunks = this._chunkCreatives(creatives, adSetsCount);

    // 5. Initialize Meta service
    const meta = new MetaAdsService({ accountId, pageId });

    // 6. Determine starting index for ad set numbering
    let startIndex = params.startIndex;
    if (startIndex == null) {
      try {
        const existingAdSets = await meta.listAdSets(campaignId);
        startIndex = existingAdSets.length + 1;
      } catch {
        startIndex = 1;
      }
    }

    // 7. Create ad sets and ads
    const targeting = profile.ad_set?.targeting || {};
    const adSets = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const adSetNum = String(startIndex + i).padStart(2, '0');
      const adSetName = `${campaignName} - AdSet ${adSetNum}`;

      try {
        const adSet = await meta.createAdSet({
          campaignId,
          name: adSetName,
          targeting,
          billingEvent: profile.ad_set?.billing_event || 'IMPRESSIONS',
          optimizationGoal: profile.ad_set?.optimization_goal || 'OFFSITE_CONVERSIONS',
          bidAmount,
          promotedObject: {
            pixel_id: pixelId,
            custom_event_type: profile.ad_set?.promoted_object?.custom_event_type || 'PURCHASE',
          },
        });

        const ads = [];
        for (const creative of chunk) {
          try {
            const adCreative = await this._uploadCreative(meta, creative, { linkUrl, pageId, urlTags });

            const ad = await meta.createAd({
              adSetId: adSet.id,
              creativeId: adCreative.id,
              name: creative.id,
              trackingSpecs: [{
                'action.type': ['offsite_conversion'],
                fb_pixel: [pixelId],
              }],
            });

            ads.push({
              creativeId: creative.id,
              adCreativeId: adCreative.id,
              adId: ad.id,
              status: 'OK',
            });
          } catch (error) {
            ads.push({
              creativeId: creative.id,
              status: 'FAILED',
              error: error.message,
            });
          }
        }

        adSets.push({
          adSetId: adSet.id,
          adSetName,
          ads,
          summary: {
            total: chunk.length,
            created: ads.filter(a => a.status === 'OK').length,
            failed: ads.filter(a => a.status === 'FAILED').length,
          },
        });
      } catch (error) {
        adSets.push({
          adSetName,
          status: 'FAILED',
          error: error.message,
          skippedCreatives: chunk.length,
        });
      }
    }

    // 8. Build result
    const totalCreated = adSets.reduce((sum, as) => sum + (as.summary?.created || 0), 0);
    const totalFailed = adSets.reduce(
      (sum, as) => sum + (as.summary?.failed || 0) + (as.skippedCreatives || 0), 0
    );

    const result = {
      success: true,
      mode: 'add_to_existing',
      campaignId,
      campaignName,
      adSets,
      summary: {
        adSetsCreated: adSets.filter(as => as.adSetId).length,
        adSetsRequested: chunks.length,
        totalAdsCreated: totalCreated,
        totalAdsFailed: totalFailed,
        totalCreatives: creatives.length,
      },
      config: {
        offerId,
        profile: campaignEntry.profile,
        bidAmount,
        pixelId,
      },
    };

    // 9. Update history
    try {
      await this.updateHistory(offerId, {
        campaign_id: campaignId,
        type: 'add_to_existing',
        ad_set_ids: adSets.filter(as => as.adSetId).map(as => as.adSetId),
        profile_used: campaignEntry.profile,
        created_at: new Date().toISOString().slice(0, 10),
        name: campaignName,
        bid_amount: bidAmount,
        ads_count: totalCreated,
        ad_sets_count: adSets.filter(as => as.adSetId).length,
        batch_id: batchId || offerConfig.creatives?.batch_dir?.split('/').pop(),
        status: 'paused',
      });
    } catch { /* non-critical */ }

    return result;
  }

  /**
   * Resolve a campaign from history by name substring or index.
   *
   * @param {string} offerId
   * @param {string|number} ref - Name substring, or numeric index (0 = most recent)
   * @returns {Promise<Object>} Matching history entry
   */
  async resolveCampaignFromHistory(offerId, ref) {
    const configPath = path.join(
      this.projectRoot, 'data/offers', offerId, 'campaign-config.yaml'
    );
    const configRaw = await fs.readFile(configPath, 'utf-8');
    const config = yaml.load(configRaw);

    const history = (config.history || []).slice().reverse(); // most recent first

    if (typeof ref === 'number' || /^\d+$/.test(String(ref))) {
      const idx = Number(ref);
      if (idx < 0 || idx >= history.length) {
        throw new Error(
          `History index ${idx} out of range. ${history.length} entries available.`
        );
      }
      return history[idx];
    }

    // String match: find by name substring (case-insensitive)
    const needle = String(ref).toLowerCase();
    const matches = history.filter(h =>
      (h.name || '').toLowerCase().includes(needle)
    );

    if (matches.length === 0) {
      throw new Error(
        `No campaign found matching "${ref}". Available: ${history.map(h => h.name).join(', ')}`
      );
    }
    return matches[0]; // most recent match
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Check if a file is a video based on extension.
   * @param {string} filePath
   * @returns {boolean}
   * @private
   */
  _isVideoFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
  }

  /**
   * Upload a creative (image or video) and create the ad creative.
   * Auto-detects media type from file extension.
   *
   * @param {MetaAdsService} meta - Initialized Meta service
   * @param {Object} creative - Creative object with imagePath, id, etc.
   * @param {Object} config - { linkUrl, pageId, urlTags }
   * @returns {Promise<Object>} Created creative result
   * @private
   */
  async _uploadCreative(meta, creative, config) {
    const { linkUrl, pageId, urlTags } = config;

    if (this._isVideoFile(creative.imagePath)) {
      return await meta.uploadVideoCreative({
        videoPath: creative.imagePath,
        name: creative.id,
        headline: creative.headline,
        description: creative.description,
        message: creative.message,
        linkUrl,
        callToAction: creative.cta,
        pageId,
        urlTags,
      });
    }

    return await meta.uploadCreative({
      imagePath: creative.imagePath,
      name: creative.id,
      headline: creative.headline,
      description: creative.description,
      message: creative.message,
      linkUrl,
      callToAction: creative.cta,
      pageId,
      urlTags,
    });
  }

  /**
   * Split creatives evenly across N chunks.
   * If count > creatives.length, caps at creatives.length.
   * @private
   */
  _chunkCreatives(creatives, count) {
    const effectiveCount = Math.min(count, creatives.length);
    const baseSize = Math.floor(creatives.length / effectiveCount);
    const remainder = creatives.length % effectiveCount;
    const chunks = [];
    let offset = 0;

    for (let i = 0; i < effectiveCount; i++) {
      const size = baseSize + (i < remainder ? 1 : 0);
      chunks.push(creatives.slice(offset, offset + size));
      offset += size;
    }

    return chunks;
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          HISTORY
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Append a history entry to campaign-config.yaml
   */
  async updateHistory(offerId, entry) {
    const configPath = path.join(this.projectRoot, 'data/offers', offerId, 'campaign-config.yaml');
    const configRaw = await fs.readFile(configPath, 'utf-8');
    const config = yaml.load(configRaw);

    if (!config.history) config.history = [];
    config.history.push(entry);

    await fs.writeFile(configPath, yaml.dump(config, { lineWidth: -1 }), 'utf-8');
  }
}

module.exports = { CampaignBuilder };
