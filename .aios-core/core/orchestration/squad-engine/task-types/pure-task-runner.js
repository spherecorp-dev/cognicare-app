/**
 * Pure Task Runner - Story 1.2
 *
 * Executes task_pura (JavaScript functions or scripts)
 *
 * Features (AC2):
 * - Execute JavaScript function mapped to task name
 * - Support for async functions
 * - Error handling and timeout
 * - Dynamic task loading from .aios-core/core/squads/{squad}/tasks/
 *
 * @module core/orchestration/squad-engine/task-types/pure-task-runner
 * @version 2.0.0
 */

const fs = require('fs').promises;
const yaml = require('js-yaml');
const path = require('path');
const { resolveProjectRoot } = require('../../../utils/resolve-project-root');

class PureTaskRunner {
  /**
   * Executes a pure task (JavaScript function or script)
   * @param {Object} taskFile - Task definition
   * @param {Object} input - Interpolated input
   * @returns {Promise<Object>} Task output
   */
  async execute(taskFile, input) {
    // Get task function from mapping
    const taskFn = this.getTaskFunction(taskFile.name);

    if (!taskFn) {
      throw new Error(
        `Pure task function not found: ${taskFile.name}. ` +
          `Available tasks: ${Object.keys(this.getTaskMap()).join(', ')}`
      );
    }

    try {
      // Execute task function with input
      const output = await taskFn(input);
      return output;
    } catch (error) {
      throw new Error(
        `Pure task execution failed (${taskFile.name}): ${error.message}`
      );
    }
  }

  /**
   * Maps task name to implementation function
   * @param {string} taskName
   * @returns {Function|null}
   */
  getTaskFunction(taskName) {
    const taskMap = this.getTaskMap();
    return taskMap[taskName] || null;
  }

  /**
   * Task function registry — all pure tasks
   * @returns {Object} Map of task name to function
   */
  getTaskMap() {
    return {
      // Squad-Copy: Intelligence phase
      'fetch-offer-data': this.fetchOfferData.bind(this),
      'spy-scrape': this.spyScrape.bind(this),
      'catalog-references': this.catalogReferences.bind(this),
      'deconstruct-references': this.deconstructReferences.bind(this),

      // Squad-Copy: Production phase
      'generate-image-prompts': this.generateImagePrompts.bind(this),
      'generate-images-api': this.generateImagesApi.bind(this),
      'package-image-creative': this.packageImageCreative.bind(this),

      // Squad-Copy: Delivery phase
      'build-video-brief': this.buildVideoBrief.bind(this),
      'build-variation-brief': this.buildVariationBrief.bind(this),

      // Squad-Copy: Transcription
      'spy-transcribe': this.spyTranscribe.bind(this),

      // Media-Squad: API Integrations (Sprint 5 D.2)
      'fetch-campaign-data': require('../../../squads/media-squad/tasks/fetch-campaign-data'),
      'create-campaign': require('../../../squads/media-squad/tasks/create-campaign'),
      'upload-creatives': require('../../../squads/media-squad/tasks/upload-creatives'),
      'setup-tracking': require('../../../squads/media-squad/tasks/setup-tracking'),
      'pause-ad': require('../../../squads/media-squad/tasks/pause-ad'),
      'scale-ad': require('../../../squads/media-squad/tasks/scale-ad'),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                    FETCH-OFFER-DATA (Intelligence Phase)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetch offer data — loads all offer files into consolidated context
   *
   * Searches: data/offers/{offerId}/ and data/offers/{offerId}-{name}/
   *
   * @param {Object} input - { offerId: string }
   * @returns {Promise<Object>} Consolidated offer data
   */
  async fetchOfferData(input) {
    const offerId = input.offerId || input.offer_id;
    if (!offerId) {
      throw new Error('offerId (or offer_id) is required for fetch-offer-data task');
    }

    // Find offer directory (supports both "MEMFR02" and "GP01-glucopure" patterns)
    const offerDir = await this._findOfferDir(offerId);

    // Load all files in parallel
    const [offerContext, currentPerf, winners, compliance, assetsInventory, testHistory] =
      await Promise.all([
        this._loadYaml(path.join(offerDir, 'offer.yaml')),
        this._loadYaml(path.join(offerDir, 'performance', 'current.yaml')),
        this._loadYaml(path.join(offerDir, 'performance', 'winners.yaml')),
        this._loadText(path.join(offerDir, 'compliance', 'rules.md')),
        this._inventoryAssets(path.join(offerDir, 'assets')),
        this._loadYaml(path.join(offerDir, 'tests', 'ab-tests.yaml')),
      ]);

    return {
      offer_context: offerContext || { id: offerId, status: 'not_found' },
      performance: {
        current: currentPerf || {},
        winners: winners || [],
      },
      compliance: compliance || '',
      assets_inventory: assetsInventory,
      test_history: testHistory || [],
    };
  }

  /**
   * Find offer directory by ID, supporting {ID} and {ID}-{name} patterns
   * @private
   */
  async _findOfferDir(offerId) {
    const offersBase = path.join(resolveProjectRoot(), 'data', 'offers');

    // Try exact match first
    const exactPath = path.join(offersBase, offerId);
    try {
      const stat = await fs.stat(exactPath);
      if (stat.isDirectory()) return exactPath;
    } catch { /* not found */ }

    // Try glob pattern: {offerId}-*
    try {
      const entries = await fs.readdir(offersBase);
      const match = entries.find(
        (e) => e.startsWith(`${offerId}-`) || e.toUpperCase() === offerId.toUpperCase()
      );
      if (match) return path.join(offersBase, match);
    } catch { /* readdir failed */ }

    throw new Error(`Offer directory not found: ${offerId} (searched: data/offers/${offerId} and data/offers/${offerId}-*)`);
  }

  /**
   * Load YAML file, return null if not found
   * @private
   */
  async _loadYaml(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return yaml.load(content);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /**
   * Load text file, return null if not found
   * @private
   */
  async _loadText(filePath) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /**
   * Inventory assets directory recursively
   * @private
   */
  async _inventoryAssets(assetsDir) {
    const inventory = { vsl_scripts: [], criativos: [], entregaveis: [], copy: [], other: [] };

    try {
      const categories = await fs.readdir(assetsDir);
      for (const category of categories) {
        const catPath = path.join(assetsDir, category);
        const stat = await fs.stat(catPath);
        if (!stat.isDirectory()) continue;

        const files = await this._listFilesRecursive(catPath);
        const key = category.replace(/-/g, '_');
        if (inventory[key] !== undefined) {
          inventory[key] = files;
        } else {
          inventory.other.push(...files.map((f) => `${category}/${f}`));
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    return inventory;
  }

  /**
   * List files recursively in a directory
   * @private
   */
  async _listFilesRecursive(dir, prefix = '') {
    const files = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          files.push(...await this._listFilesRecursive(path.join(dir, entry.name), relativePath));
        } else {
          files.push(relativePath);
        }
      }
    } catch { /* empty */ }
    return files;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                 GENERATE-IMAGE-PROMPTS (Production Phase)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Transform approved image concepts into API-ready prompts
   *
   * @param {Object} input - { concepts: Array, offer_context: Object }
   * @returns {Promise<Object>} { prompts: Array }
   */
  async generateImagePrompts(input) {
    let concepts = input.concepts || input.image_concepts;
    const offer_context = input.offer_context;
    if (!concepts || !Array.isArray(concepts)) {
      throw new Error('concepts (or image_concepts) array is required for generate-image-prompts');
    }

    // Filter by approved concepts if provided (review step returns sparse objects with concept_id)
    const approved = input.approved_concepts;
    if (Array.isArray(approved) && approved.length > 0) {
      const approvedIds = new Set(
        approved.map(a => a.concept_id || a.id).filter(Boolean).map(String)
      );
      // Only filter if we have meaningful IDs to match against
      if (approvedIds.size > 0) {
        const filtered = concepts.filter(c => {
          const cId = String(c.id || '');
          const cNum = cId.replace(/\D/g, ''); // extract number from "concept-1" → "1"
          return approvedIds.has(cId) || approvedIds.has(cNum);
        });
        // Use filtered if it matched something, otherwise keep all (safety)
        if (filtered.length > 0) {
          concepts = filtered;
        }
      }
    }

    const prompts = [];
    for (const concept of concepts) {
      const basePrompt = this._buildImagePrompt(concept, offer_context);
      const textOverlay = concept.text_overlay || {};

      // 1 prompt per concept — 1024x1024 HD (GPT Image 1.5, universal)
      prompts.push({
        conceptId: concept.id || `concept-${prompts.length + 1}`,
        prompt: basePrompt,
        negativePrompt: this._buildNegativePrompt(concept),
        width: 1024,
        height: 1024,
        placement: 'universal',
        headline: textOverlay.headline || concept.headline || '',
        cta: textOverlay.cta || concept.cta || '',
        angle: concept.angle || '',
      });
    }

    return { prompts, total: prompts.length };
  }

  /** @private */
  _buildImagePrompt(concept, offerContext) {
    const visual = concept.visual || {};
    const parts = [];
    // Support both flat (concept.visual_description) and nested (concept.visual.scene) formats
    if (visual.scene) parts.push(visual.scene);
    else if (concept.visual_description) parts.push(concept.visual_description);
    if (visual.mood || concept.mood) parts.push(`Mood: ${visual.mood || concept.mood}`);
    if (visual.style) parts.push(`Style: ${visual.style}`);
    if (visual.colors) parts.push(`Colors: ${visual.colors}`);
    if (visual.composition) parts.push(`Composition: ${visual.composition}`);
    if (concept.setting) parts.push(`Setting: ${concept.setting}`);
    if (offerContext?.vertical) parts.push(`Context: ${offerContext.vertical}`);
    // Enforce language from offer context
    const lang = offerContext?.idioma || offerContext?.geos?.[0] || '';
    if (lang) {
      const langMap = { fr: 'French', es: 'Spanish', en: 'English', pt: 'Portuguese' };
      const langName = langMap[lang.toLowerCase()] || lang;
      parts.push(`Any text in the image MUST be in ${langName}`);
    }
    parts.push('High quality, professional advertisement, attention-grabbing');
    return parts.join('. ');
  }

  /** @private */
  _buildNegativePrompt(concept) {
    const defaults = 'text, watermark, logo, blurry, low quality, distorted faces, stock photo look';
    return concept.negative_prompt ? `${defaults}, ${concept.negative_prompt}` : defaults;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                 GENERATE-IMAGES-API (Production Phase)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Call ImageGenerationService for each prompt and save results
   *
   * @param {Object} input - { prompts: Array, offerId: string }
   * @returns {Promise<Object>} { generated: Array, report: Object }
   */
  async generateImagesApi(input) {
    const { ImageGenerationService } = require('../../../services/image-generation-service');

    const prompts = input.prompts || input.api_ready_prompts;
    const offerId = input.offerId;
    if (!prompts || !Array.isArray(prompts)) {
      throw new Error('prompts (or api_ready_prompts) array is required for generate-images-api');
    }

    const service = new ImageGenerationService();
    const timestamp = new Date().toISOString().split('T')[0];
    const outputDir = path.join(
      resolveProjectRoot(), 'data', 'offers', offerId, 'assets', 'criativos', 'batches', `${timestamp}-batch`
    );

    await fs.mkdir(outputDir, { recursive: true });

    const generated = [];
    const errors = [];

    for (let i = 0; i < prompts.length; i++) {
      const promptSpec = prompts[i];
      // Support both generate_image_prompts format ({prompt, conceptId})
      // and review_generated_image regeneration format ({adjusted_prompt, image_id})
      const promptText = promptSpec.prompt || promptSpec.adjusted_prompt;
      const conceptId = promptSpec.conceptId || promptSpec.image_id || `concept-${i + 1}`;
      try {
        console.log(`[generate_images_api] Generating image ${i + 1}/${prompts.length}: ${conceptId}...`);

        const result = await service.generate({
          prompt: promptText,
          width: promptSpec.width || 1024,
          height: promptSpec.height || 1024,
        });

        // Filename format: STE-IMG-{OFFERID}-{NN}H{VV}.png (no hyphens between num and H)
        const conceptNum = String(i + 1).padStart(2, '0');
        const fileName = `STE-IMG-${offerId}-${conceptNum}H00.png`;
        const filePath = path.join(outputDir, fileName);
        await service.saveImage(result.buffer, filePath);

        console.log(`[generate_images_api] OK: ${fileName} (${(result.buffer.length / 1024).toFixed(0)}KB, ${result.metadata.provider})`);

        generated.push({
          conceptId,
          placement: promptSpec.placement || 'universal',
          path: filePath,
          fileName,
          provider: result.metadata.provider,
          bytes: result.buffer.length,
          revisedPrompt: result.metadata.revisedPrompt,
        });
      } catch (error) {
        console.error(`[generate_images_api] FAILED: ${conceptId} — ${error.message}`);
        errors.push({
          conceptId,
          error: error.message,
        });
      }
    }

    return {
      generated,
      errors,
      report: {
        total: prompts.length,
        success: generated.length,
        failed: errors.length,
        outputDir,
        provider: generated[0]?.provider || 'unknown',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                 PACKAGE-IMAGE-CREATIVE (Delivery Phase)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Package creative assets for traffic delivery
   *
   * @param {Object} input - { generated: Array, offerId: string, adCopy: Object }
   * @returns {Promise<Object>} { package: Object }
   */
  async packageImageCreative(input) {
    // Use approved_images from review, or fall back to original generated files
    // (review may reject all but images still exist on disk)
    let generated = input.approved_images || [];
    if (!Array.isArray(generated) || generated.length === 0 || !generated[0]?.path) {
      generated = input.generated_images || input.generated || [];
    }
    const offerId = input.offerId;
    const concepts = input.adCopy || input.ad_copy || [];
    const angles = input.angles || [];
    const methodDecisions = input.method_decisions || input.methodDecisions || [];
    const platforms = input.platforms || ['facebook'];

    const timestamp = new Date().toISOString().split('T')[0];

    // Determine batch number from existing batches
    const batchesDir = path.join(
      resolveProjectRoot(), 'data', 'offers', offerId, 'assets', 'criativos', 'batches'
    );
    await fs.mkdir(batchesDir, { recursive: true });
    let batchNum = '';
    try {
      const existing = await fs.readdir(batchesDir);
      const todayBatches = existing.filter(d => d.startsWith(timestamp));
      if (todayBatches.length > 0) {
        batchNum = `-${String(todayBatches.length + 1).padStart(3, '0')}`;
      }
    } catch { /* first batch */ }

    const batchDir = path.join(batchesDir, `${timestamp}-batch${batchNum}`);
    await fs.mkdir(path.join(batchDir, 'meta'), { recursive: true });
    await fs.mkdir(path.join(batchDir, 'images'), { recursive: true });

    // Build angle lookup map for enriching concepts with UMP/hook data
    const angleMap = {};
    for (const angle of (Array.isArray(angles) ? angles : [])) {
      const key = (angle.name || angle.angle || '').toLowerCase().trim();
      angleMap[key] = angle;
    }

    // Detect creative profile and geo — prefer offer_context.idioma as source of truth
    const firstConcept = Array.isArray(concepts) ? concepts[0] : null;
    const offerCtx = input.offer_context;
    const geo = offerCtx?.idioma?.toUpperCase()
      || offerCtx?.geos?.[0]?.toUpperCase()
      || firstConcept?.geo
      || angles[0]?.geo_notes?.match(/^(FR|ES|EN)/)?.[0]
      || 'FR';
    const profile = firstConcept?.creative_profile || concepts?.metadata?.creative_profile || 'blackhat-dr';

    // Determine primary method from method decisions
    let primaryMethod = 'do_zero';
    if (Array.isArray(methodDecisions) && methodDecisions.length > 0) {
      const methods = methodDecisions.map(m => m.method || m);
      const counts = {};
      methods.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
      primaryMethod = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'do_zero';
    }

    // Enrich concepts with angle metadata
    const enrichedConcepts = (Array.isArray(concepts) ? concepts : []).map((concept, i) => {
      const angleName = (concept.angle || '').toLowerCase().trim();
      const angleData = angleMap[angleName] || {};
      return {
        ...concept,
        _angle: angleData,
        _index: i,
      };
    });

    // Determine which platforms get ad copy
    const hasMeta = platforms.some(p => ['facebook', 'instagram', 'meta'].includes(p?.toLowerCase()));
    const hasTiktok = platforms.some(p => p?.toLowerCase() === 'tiktok');

    // Write META-AD-COPY.md
    if (hasMeta || !hasTiktok) {
      await fs.writeFile(
        path.join(batchDir, 'meta', 'META-AD-COPY.md'),
        this._formatAdCopyPro(enrichedConcepts, {
          platform: 'Meta',
          offerId,
          batchNum: batchNum || '',
          geo,
          profile,
          method: primaryMethod,
          generated,
        }),
        'utf8'
      );
    }

    // Write TIKTOK-AD-COPY.md
    if (hasTiktok) {
      await fs.writeFile(
        path.join(batchDir, 'meta', 'TIKTOK-AD-COPY.md'),
        this._formatAdCopyPro(enrichedConcepts, {
          platform: 'TikTok',
          offerId,
          batchNum: batchNum || '',
          geo,
          profile,
          method: primaryMethod,
          generated,
        }),
        'utf8'
      );
    }

    // Copy generated images to batch images/ dir
    for (const img of generated) {
      if (img.path) {
        try {
          const dest = path.join(batchDir, 'images', path.basename(img.path));
          await fs.copyFile(img.path, dest);
        } catch { /* image copy failed, non-critical */ }
      }
    }

    // Write generation-metadata.json
    if (generated.length > 0) {
      await fs.writeFile(
        path.join(batchDir, 'images', 'generation-metadata.json'),
        JSON.stringify({ generated, generatedAt: new Date().toISOString() }, null, 2),
        'utf8'
      );
    }

    // Write BATCH-README.md (executive summary)
    const totalConcepts = enrichedConcepts.length;
    const totalVariations = enrichedConcepts.reduce((sum, c) => sum + (c.variations?.length || 0), 0);
    const platformStr = platforms.join(', ');
    const conceptSummary = enrichedConcepts.map((c, i) => {
      const a = c._angle || {};
      const ump = a.type || c.type || 'N/A';
      const hook = a.hook_type || 'N/A';
      const conf = a.confidence || c.confidence || 'N/A';
      return `| C${i + 1} | ${c.angle || 'N/A'} | ${ump} | ${hook} | ${conf} |`;
    }).join('\n');

    const readme = [
      `# Batch: ${timestamp}${batchNum}`,
      ``,
      `## Offer: ${offerId}`,
      `## Generated: ${new Date().toISOString()}`,
      `## Profile: ${profile} | Geo: ${geo} | Method: ${primaryMethod}`,
      `## Platforms: ${platformStr}`,
      `## Criativos: ${totalConcepts} conceitos | ${totalVariations} variacoes | ${generated.length} imagens`,
      ``,
      `## Conceitos`,
      ``,
      `| # | Angulo | UMP | Hook | Confidence |`,
      `|---|--------|-----|------|------------|`,
      conceptSummary,
      ``,
      `## Pipeline Status`,
      ``,
      `- Conceitos gerados: ${totalConcepts}`,
      `- Variacoes por conceito: ${enrichedConcepts.map(c => c.variations?.length || 0).join(', ')}`,
      `- Imagens geradas: ${generated.length}/${totalConcepts}`,
      `- Ad copy: ${hasMeta ? 'META-AD-COPY.md' : ''}${hasTiktok ? ' TIKTOK-AD-COPY.md' : ''}`,
      ``,
      `## Files`,
      ``,
      ...(generated.length > 0
        ? generated.map(g => `- ${path.basename(g.path)} (${g.placement || 'feed'}, ${g.style || 'default'})`)
        : ['- (nenhuma imagem gerada — verificar logs de geracao)']),
    ].join('\n');

    await fs.writeFile(path.join(batchDir, 'BATCH-README.md'), readme, 'utf8');

    // Update creative-registry.yaml
    const registryPath = path.join(
      resolveProjectRoot(), 'data', 'offers', offerId, 'assets', 'criativos', 'creative-registry.yaml'
    );
    await this._updateCreativeRegistry(registryPath, generated, `${timestamp}${batchNum}`);

    return {
      package: {
        batchDir,
        files: generated.map((g) => path.basename(g.path)),
        totalCreatives: enrichedConcepts.length,
        totalImages: generated.length,
        adCopyFiles: [
          hasMeta ? 'META-AD-COPY.md' : null,
          hasTiktok ? 'TIKTOK-AD-COPY.md' : null,
        ].filter(Boolean),
        packagedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Format ad copy in professional production format (Stefan Georgi method)
   * @private
   */
  _formatAdCopyPro(concepts, opts) {
    const { platform, offerId, batchNum, geo, profile, method, generated } = opts;
    const lines = [];

    // Header block
    lines.push(`# ${platform.toUpperCase()} AD COPY — ${offerId} Batch${batchNum ? ' ' + batchNum.replace('-', '') : ''}`);
    lines.push(`# ${concepts.length} Conceitos | ${platform} Ads | ${geo}`);
    lines.push(`# Writer: STE (Stefan Georgi) | Created: ${new Date().toISOString().split('T')[0]}`);
    lines.push(`# Profile: ${profile} | Geo: ${geo} | Method: ${method}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Per-concept blocks
    for (let i = 0; i < concepts.length; i++) {
      const c = concepts[i];
      const angle = c._angle || {};
      const conceptNum = i + 1;
      const ump = angle.type || c.type || 'N/A';
      const hookType = angle.hook_type || 'N/A';
      const paddedNum = String(conceptNum).padStart(2, '0');
      const imgRef = generated?.[i]?.path ? path.basename(generated[i].path) : `STE-IMG-${offerId}-${paddedNum}H00.png`;

      // Concept header
      lines.push(`## C${conceptNum} — ${c.angle || c.id || 'Conceito ' + conceptNum}`);
      lines.push(`**ID:** STE-IMG-${offerId}-${paddedNum}H00`);
      lines.push(`**UMP:** ${this._capitalizeFirst(ump)} | **Hook:** ${this._capitalizeFirst(hookType)}`);
      lines.push(`**Image:** ${imgRef}`);
      lines.push('');

      // Primary text — pick best format for geo/angle or first available
      const primaryTexts = c.ad_copy?.primary_texts || {};
      const bestFormat = this._pickBestFormat(ump, geo, platform);
      const primaryText = primaryTexts[bestFormat] || Object.values(primaryTexts)[0] || '';
      const formatLabel = bestFormat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      if (primaryText) {
        lines.push(`**Primary Text (${formatLabel}):**`);
        lines.push(primaryText);
        lines.push('');
      }

      // Headline — pick first or best
      const headlines = c.ad_copy?.headlines || [];
      if (headlines.length > 0) {
        lines.push(`**Headline:**`);
        lines.push(headlines[0]);
        lines.push('');
      }

      // Description
      const descriptions = c.ad_copy?.descriptions || [];
      if (descriptions.length > 0) {
        lines.push(`**Description:**`);
        lines.push(descriptions[0]);
        lines.push('');
      }

      // CTA
      const cta = c.text_overlay?.cta || 'En savoir plus';
      lines.push(`**CTA Button:** ${cta}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Compliance notes
    lines.push('# COMPLIANCE NOTES');
    lines.push(`# - Profile: ${profile}`);
    if (profile === 'blackhat-dr') {
      lines.push('# - Zero mencao a preco, produto ou aparencia de ad');
      lines.push('# - Todos os CTAs direcionam para video/informacao (nao compra)');
      lines.push('# - Linguagem soft: "decouverte", "methode naturelle", "approche ancestrale"');
      lines.push('# - Sem claims diretos de cura ou resultado garantido');
      lines.push('# - Mecanismo INSINUADO (loop aberto) — nunca revelado no ad');
    } else if (profile === 'low-ticket') {
      lines.push('# - Preco pode aparecer, produto pode ser mostrado');
      lines.push('# - CTA direto: compra, oferta, urgencia');
    } else if (profile === 'whitehat-brand') {
      lines.push('# - Tom profissional e transparente');
      lines.push('# - Claims 100% verificaveis');
    }
    lines.push(`# - Todas as CTAs usam botao ${platform} padrao`);
    lines.push('#');

    // Format choice rationale per concept
    lines.push('# FORMATO ESCOLHIDO POR CONCEITO:');
    for (let i = 0; i < concepts.length; i++) {
      const c = concepts[i];
      const angle = c._angle || {};
      const ump = angle.type || c.type || 'N/A';
      const bestFormat = this._pickBestFormat(ump, geo, platform.toLowerCase());
      lines.push(`# C${i + 1}: ${bestFormat.replace(/_/g, '-')} (${ump} → ${geo} preferred)`);
    }

    return lines.join('\n');
  }

  /**
   * Pick best ad copy format based on UMP type, geo, and platform
   * @private
   */
  _pickBestFormat(umpType, geo, platform) {
    // Geo preferences
    const geoPrefs = {
      FR: { story_style: 3, news_style: 2, question_style: 2, testimonial_style: 1, list_style: 1 },
      ES: { testimonial_style: 3, story_style: 2, question_style: 1, news_style: 1, list_style: 1 },
      EN: { list_style: 3, question_style: 2, story_style: 1, news_style: 2, testimonial_style: 1 },
    };

    // UMP type preferences
    const umpPrefs = {
      causa: { question_style: 3, news_style: 2 },
      consequencia: { story_style: 3, testimonial_style: 2 },
      solucao: { question_style: 2, list_style: 3 },
      invalidacao: { list_style: 3, news_style: 2 },
      prova: { testimonial_style: 3, story_style: 2 },
    };

    // TikTok prefers shorter formats
    const platformPrefs = platform === 'tiktok'
      ? { question_style: 2, list_style: 2 }
      : {};

    // Combine scores
    const scores = {};
    const allFormats = ['story_style', 'list_style', 'question_style', 'testimonial_style', 'news_style'];
    for (const fmt of allFormats) {
      scores[fmt] = (geoPrefs[geo]?.[fmt] || 1)
        + (umpPrefs[umpType?.toLowerCase()]?.[fmt] || 0)
        + (platformPrefs[fmt] || 0);
    }

    // Return highest scoring format
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }

  /** @private */
  _capitalizeFirst(str) {
    if (!str || str === 'N/A') return str;
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
  }

  /**
   * Legacy format — kept for backward compatibility
   * @private
   */
  _formatAdCopy(copies, platform) {
    const lines = [`# ${platform} Ad Copy\n`];
    for (const copy of Array.isArray(copies) ? copies : [copies]) {
      lines.push(`## ${copy.angle || 'Variation'}\n`);
      if (copy.headlines && Array.isArray(copy.headlines)) {
        lines.push('### Headlines');
        copy.headlines.forEach((h, i) => lines.push(`${i + 1}. ${h}`));
        lines.push('');
      } else if (copy.headline) {
        lines.push(`**Headline:** ${copy.headline}`);
      }
      if (copy.descriptions && Array.isArray(copy.descriptions)) {
        lines.push('### Descriptions');
        copy.descriptions.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
        lines.push('');
      }
      if (copy.primary_texts && typeof copy.primary_texts === 'object') {
        lines.push('### Primary Texts');
        for (const [format, text] of Object.entries(copy.primary_texts)) {
          lines.push(`\n**${format.replace(/_/g, ' ')}:**`);
          lines.push(text);
        }
        lines.push('');
      }
      lines.push('\n---\n');
    }
    return lines.join('\n');
  }

  /** @private */
  async _updateCreativeRegistry(registryPath, generated, batchId) {
    let registry = {};
    try {
      const content = await fs.readFile(registryPath, 'utf8');
      registry = yaml.load(content) || {};
    } catch { /* first batch */ }

    if (!registry.batches) registry.batches = [];
    registry.batches.push({
      id: batchId,
      count: generated.length,
      createdAt: new Date().toISOString(),
      files: generated.map((g) => path.basename(g.path)),
    });
    registry.total_creatives = (registry.total_creatives || 0) + generated.length;
    registry.last_updated = new Date().toISOString();

    await fs.writeFile(registryPath, yaml.dump(registry), 'utf8');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                    SPY-TRANSCRIBE (Intelligence Phase)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Transcribe spy videos/audios using TranscriptionService
   *
   * @param {Object} input - { files: Array<string>, language: string }
   * @returns {Promise<Object>} { transcriptions: Array }
   */
  async spyTranscribe(input) {
    const { TranscriptionService } = require('../../../services/transcription-service');

    // Accept both 'files' (string[]) and 'raw_media' (object[] from spy-scrape)
    const rawFiles = input.files || input.raw_media || [];
    const files = rawFiles.map(f => typeof f === 'string' ? f : f.path).filter(Boolean);
    const language = input.language;
    if (!files || files.length === 0) {
      return { transcriptions: [], summary: { total: 0, success: 0, failed: 0, usable: 0 } };
    }

    const service = new TranscriptionService({ language });
    const transcriptions = [];

    for (const filePath of files) {
      try {
        const ext = path.extname(filePath).toLowerCase();
        const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'];

        let result;
        if (videoExtensions.includes(ext)) {
          result = await service.transcribeVideo(filePath, { language });
        } else {
          result = await service.transcribe(filePath, { language });
        }

        const quality = service.assessQuality(result);

        transcriptions.push({
          file: filePath,
          text: result.text,
          segments: result.segments,
          language: result.language,
          duration: result.duration,
          quality,
        });
      } catch (error) {
        transcriptions.push({
          file: filePath,
          error: error.message,
          quality: { quality: 'error', score: 0, usable: false },
        });
      }
    }

    return {
      transcriptions,
      summary: {
        total: files.length,
        success: transcriptions.filter((t) => !t.error).length,
        failed: transcriptions.filter((t) => t.error).length,
        usable: transcriptions.filter((t) => t.quality?.usable).length,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                    SPY-SCRAPE (Intelligence Phase)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Spy scrape — currently manual-first approach.
   * Returns empty results if no manual references were added.
   * Future: connect to ad spy APIs (Meta Ad Library, TikTok Creative Center).
   *
   * @param {Object} input - { spy_brief: Object }
   * @returns {Promise<Object>} Raw media and manifest
   */
  async spyScrape(input) {
    const { spy_brief } = input;

    // Check if manual references exist in the offer's spy directory
    const offerId = spy_brief?.offer_id || input.offer_id || input.offerId;
    let manualFiles = [];

    if (offerId) {
      const spyDir = path.join(resolveProjectRoot(), 'data', 'offers', offerId, 'assets', 'spy');
      try {
        const entries = await fs.readdir(spyDir, { withFileTypes: true });
        manualFiles = entries
          .filter((e) => !e.isDirectory())
          .map((e) => ({
            path: path.join(spyDir, e.name),
            name: e.name,
            type: this._detectMediaType(e.name),
          }));
      } catch { /* no spy dir yet — that's fine */ }
    }

    return {
      raw_media: manualFiles,
      spy_manifest: {
        mode: manualFiles.length > 0 ? 'manual' : 'no_references',
        total_files: manualFiles.length,
        source: 'manual',
        note: manualFiles.length === 0
          ? 'No spy references found. Pipeline continues with offer data + performance only.'
          : `Found ${manualFiles.length} manual reference(s).`,
      },
    };
  }

  /** @private */
  _detectMediaType(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (['.mp4', '.mov', '.avi', '.webm'].includes(ext)) return 'video';
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return 'image';
    if (['.txt', '.md'].includes(ext)) return 'text';
    return 'other';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                  CATALOG-REFERENCES (Intelligence Phase)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Catalog references — structures and categorizes raw references.
   * If no references, returns empty catalog so pipeline continues.
   *
   * @param {Object} input - { references: Array }
   * @returns {Promise<Object>} Cataloged references with metadata
   */
  async catalogReferences(input) {
    const references = input.references || [];

    if (!Array.isArray(references) || references.length === 0) {
      return {
        cataloged: [],
        summary: {
          total: 0,
          by_type: {},
          note: 'No references to catalog. Pipeline continues with offer data only.',
        },
      };
    }

    // Catalog each reference with metadata
    const cataloged = references.map((ref, index) => ({
      id: `ref-${String(index + 1).padStart(3, '0')}`,
      ...ref,
      cataloged_at: new Date().toISOString(),
      type: ref.type || 'unknown',
      platform: ref.platform || 'unknown',
      quality_score: ref.quality?.score || null,
    }));

    // Group by type
    const byType = {};
    for (const item of cataloged) {
      byType[item.type] = (byType[item.type] || 0) + 1;
    }

    return {
      cataloged,
      summary: {
        total: cataloged.length,
        by_type: byType,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                DECONSTRUCT-REFERENCES (Intelligence Phase)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Deconstruct references — extracts Hook/Mechanism/Proof/CTA patterns.
   * If no references, returns empty patterns so strategy phase can still work.
   *
   * @param {Object} input - { cataloged_references: Array }
   * @returns {Promise<Object>} Deconstructions and patterns
   */
  async deconstructReferences(input) {
    const cataloged = input.cataloged_references || input.cataloged || [];

    if (!Array.isArray(cataloged) || cataloged.length === 0) {
      return {
        deconstructions: [],
        patterns: {
          hooks: [],
          mechanisms: [],
          proofs: [],
          ctas: [],
          dominant_angles: [],
          note: 'No references to deconstruct. Strategy phase will use offer data + performance only.',
        },
      };
    }

    // Basic structural extraction from cataloged references
    const deconstructions = cataloged.map((ref) => ({
      reference_id: ref.id,
      hook: ref.hook || ref.reconstructed_references?.hook || null,
      mechanism: ref.mechanism || ref.reconstructed_references?.mechanism || null,
      proof: ref.proof || ref.reconstructed_references?.proof || null,
      cta: ref.cta || ref.reconstructed_references?.cta || null,
      angle: ref.angle || null,
      platform: ref.platform || null,
    }));

    // Extract patterns
    const patterns = {
      hooks: [...new Set(deconstructions.map((d) => d.hook).filter(Boolean))],
      mechanisms: [...new Set(deconstructions.map((d) => d.mechanism).filter(Boolean))],
      proofs: [...new Set(deconstructions.map((d) => d.proof).filter(Boolean))],
      ctas: [...new Set(deconstructions.map((d) => d.cta).filter(Boolean))],
      dominant_angles: [...new Set(deconstructions.map((d) => d.angle).filter(Boolean))],
    };

    return { deconstructions, patterns };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                   BUILD-VIDEO-BRIEF (Delivery Phase)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build video editing brief from approved scripts + ad copy.
   *
   * @param {Object} input - { script, ad_copy, format_assignment }
   * @returns {Promise<Object>} Video brief for editor
   */
  async buildVideoBrief(input) {
    const { script, ad_copy, format_assignment } = input;
    const scripts = Array.isArray(script) ? script : [script].filter(Boolean);

    const briefs = scripts.map((s, idx) => ({
      brief_id: `VB-${String(idx + 1).padStart(3, '0')}`,
      script_text: typeof s === 'string' ? s : s?.text || s?.content || JSON.stringify(s),
      duration_target: s?.duration || '30-60s',
      format: s?.format || format_assignment?.format || 'vertical_9x16',
      platform: s?.platform || format_assignment?.platform || 'meta',
      ad_copy: {
        headline: ad_copy?.headline || ad_copy?.[idx]?.headline || '',
        description: ad_copy?.description || ad_copy?.[idx]?.description || '',
        cta: ad_copy?.cta || ad_copy?.[idx]?.cta || '',
      },
      instructions: [
        'Hook forte nos primeiros 3 segundos',
        'Legendas/subtitles em todas as cenas faladas',
        'CTA visual no final (ultimo frame)',
        'Música de fundo energética (royalty free)',
      ],
      created_at: new Date().toISOString(),
    }));

    return {
      video_brief: briefs,
      summary: {
        total_briefs: briefs.length,
        formats: [...new Set(briefs.map((b) => b.format))],
        platforms: [...new Set(briefs.map((b) => b.platform))],
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //              BUILD-VARIATION-BRIEF (Delivery Phase)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build brief for winner variation (modeling existing winner with tweaks).
   *
   * @param {Object} input - { winners: Array }
   * @returns {Promise<Object>} Variation brief
   */
  async buildVariationBrief(input) {
    const winners = input.winners || [];
    const winnerList = Array.isArray(winners) ? winners : [winners].filter(Boolean);

    const briefs = winnerList.map((winner, idx) => ({
      brief_id: `VAR-${String(idx + 1).padStart(3, '0')}`,
      original_creative: winner.creative_id || winner.id || `winner-${idx + 1}`,
      original_performance: {
        cpa: winner.cpa || winner.metrics?.cpa || null,
        ctr: winner.ctr || winner.metrics?.ctr || null,
        roas: winner.roas || winner.metrics?.roas || null,
      },
      variation_type: winner.variation_type || 'hook_swap',
      instructions: [
        `Base: manter estrutura do winner ${winner.creative_id || idx + 1}`,
        'Trocar hook (primeiros 3s ou headline)',
        'Manter mecanismo + prova social',
        'Testar CTA diferente',
        'Manter mesmo target/placement',
      ],
      created_at: new Date().toISOString(),
    }));

    return {
      variation_brief: briefs,
      summary: {
        total_variations: briefs.length,
        variation_types: [...new Set(briefs.map((b) => b.variation_type))],
      },
    };
  }
}

module.exports = PureTaskRunner;
