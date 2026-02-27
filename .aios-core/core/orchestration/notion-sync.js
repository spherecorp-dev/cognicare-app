/**
 * Notion Sync — EventStore → Notion Bridge
 *
 * Auto-creates Notion tasks when squad runs start,
 * updates subtasks as steps complete, and adds
 * human-readable activity logs as comments.
 *
 * All Notion calls are fire-and-forget — pipeline never blocks on Notion.
 *
 * @module NotionSync
 */

const { NotionService } = require('../services/notion-service');

// ═══════════════════════════════════════════════════════════════════════════════
//                         HUMAN-READABLE STEP NAMES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps technical step IDs to human-readable descriptions in Portuguese.
 * Used for Notion comments and subtask names.
 */
const STEP_NAMES = {
  // Intelligence phase
  fetch_data: 'Carregar dados da oferta',
  interpret_data: 'Analisar dados da oferta',
  direct_spy: 'Preparar pesquisa de referências',
  spy_scrape: 'Coletar referências do mercado',
  spy_transcribe: 'Transcrever referências de vídeo',
  spy_reconstruct: 'Reconstruir copy das referências',
  catalog: 'Catalogar referências encontradas',
  deconstruct: 'Desconstruir padrões das referências',

  // Strategy phase
  suggest_angles: 'Sugerir ângulos criativos',
  select_method: 'Definir método de criação',
  decide_format: 'Decidir formatos de conteúdo',

  // Production phase
  route_production: 'Direcionar produção por formato',
  generate_image_concepts: 'Gerar conceitos visuais',
  generate_scripts: 'Criar scripts de vídeo',

  // Review phase
  review_image_concept: 'Revisar conceitos de imagem',
  image_revision_loop: 'Ciclo de revisão de imagens',
  generate_image_prompts: 'Preparar prompts de imagem',
  generate_images_api: 'Gerar imagens via IA',
  review_generated_image: 'Revisar imagens geradas',
  regenerate_loop: 'Regenerar imagens rejeitadas',
  review_creative: 'Revisar criativos de vídeo',
  request_revision: 'Solicitar revisão',
  dr_copywriter_fix: 'Corrigir copy',
  generate_ad_copy: 'Gerar ad copy para plataformas',

  // Delivery phase
  package_image: 'Empacotar criativos de imagem',
  build_brief: 'Montar brief de vídeo',
  build_variation: 'Criar variações de criativos',
  handoff: 'Entregar criativos para mídia',
};

/**
 * Maps phase names to human-readable descriptions.
 */
const PHASE_NAMES = {
  intelligence: 'Pesquisa e Inteligência',
  strategy: 'Estratégia Criativa',
  production: 'Produção de Conteúdo',
  review: 'Revisão e Qualidade',
  delivery: 'Entrega',
};

/**
 * Main subtask list per squad — defines which steps appear as Notion subtasks.
 * Only key steps are included to avoid overwhelming the Notion page.
 */
const SQUAD_SUBTASKS = {
  'squad-copy': [
    { stepId: 'fetch_data', text: 'Carregar dados da oferta' },
    { stepId: 'suggest_angles', text: 'Sugerir ângulos criativos' },
    { stepId: 'select_method', text: 'Definir método de criação' },
    { stepId: 'decide_format', text: 'Decidir formatos (imagem/vídeo)' },
    { stepId: 'generate_image_concepts', text: 'Gerar conceitos visuais' },
    { stepId: 'review_image_concept', text: 'Revisar conceitos' },
    { stepId: 'generate_images_api', text: 'Gerar imagens' },
    { stepId: 'review_generated_image', text: 'Aprovar imagens' },
    { stepId: 'generate_ad_copy', text: 'Criar ad copy' },
    { stepId: 'package_image', text: 'Empacotar para entrega' },
  ],
  'media-squad': [
    { stepId: 'fetch_campaign_data', text: 'Carregar dados de campanhas' },
    { stepId: 'analyze_performance', text: 'Analisar performance' },
    { stepId: 'suggest_optimization', text: 'Sugerir otimizações' },
    { stepId: 'create_campaign', text: 'Criar campanha' },
    { stepId: 'upload_creatives', text: 'Fazer upload de criativos' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
//                              NOTION SYNC CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class NotionSync {
  /**
   * @param {Object} [options]
   * @param {string} [options.apiKey] - Notion API key (defaults to env)
   * @param {string} [options.databaseId] - Notion database ID (defaults to env)
   * @param {boolean} [options.enabled=true] - Enable/disable sync
   */
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.notion = new NotionService({
      apiKey: options.apiKey,
      databaseId: options.databaseId,
    });

    // runId → { pageId, subtaskBlockIds: Map<stepId, blockId> }
    this.runTaskMap = new Map();
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Handle run.started event — create Notion task with subtasks
   */
  async onRunStarted(runId, data = {}) {
    if (!this.enabled) return;

    const squadId = data.squadId || 'unknown';
    const offerId = data.trigger?.data?.offerId || data.trigger?.offer || '';
    const triggerType = data.trigger?.type || 'manual';

    try {
      // Create the main task
      const task = await this.notion.createTask({
        title: this._buildTaskTitle(squadId, offerId),
        type: 'Creative',
        squad: squadId,
        source: triggerType,
        status: 'In Progress',
        priority: 'High',
        runId: runId,
        tags: [squadId, offerId].filter(Boolean),
      });

      const pageId = task.id;

      // Create subtasks
      const subtaskDefs = SQUAD_SUBTASKS[squadId] || [];
      if (subtaskDefs.length > 0) {
        await this.notion.addSubtasks(
          pageId,
          subtaskDefs.map(s => ({ text: s.text, checked: false })),
        );
      }

      // Read subtask block IDs for later update
      const subtaskBlockIds = new Map();
      try {
        const blocks = await this.notion.getSubtasks(pageId);
        for (let i = 0; i < blocks.length && i < subtaskDefs.length; i++) {
          subtaskBlockIds.set(subtaskDefs[i].stepId, blocks[i].id);
        }
      } catch {
        // Non-critical — subtask checkmarks won't work but comments still will
      }

      // Add initial comment
      await this.notion.addComment(
        pageId,
        `Produção iniciada para ${offerId ? `oferta ${offerId}` : squadId}. Acompanhe o progresso aqui.`,
      );

      // Store mapping
      this.runTaskMap.set(runId, { pageId, subtaskBlockIds });
    } catch (error) {
      // Fire-and-forget — log but don't throw
      console.warn(`[NotionSync] Failed to create task for run ${runId}:`, error.message);
    }
  }

  /**
   * Handle step.completed event — check subtask + add comment
   */
  async onStepCompleted(runId, data = {}) {
    if (!this.enabled) return;

    const mapping = this.runTaskMap.get(runId);
    if (!mapping) return;

    const { pageId, subtaskBlockIds } = mapping;
    const stepId = data.stepId;
    const durationMs = data.duration_ms;

    try {
      // Mark subtask as done
      const blockId = subtaskBlockIds.get(stepId);
      if (blockId) {
        await this.notion.updateSubtask(blockId, true).catch(() => {});
      }

      // Add human-readable comment
      const comment = this._toHumanReadable(stepId, durationMs);
      if (comment) {
        await this.notion.addComment(pageId, comment);
      }
    } catch (error) {
      console.warn(`[NotionSync] Failed to update step ${stepId} for run ${runId}:`, error.message);
    }
  }

  /**
   * Handle phase.completed event — add phase summary comment
   */
  async onPhaseCompleted(runId, data = {}) {
    if (!this.enabled) return;

    const mapping = this.runTaskMap.get(runId);
    if (!mapping) return;

    const phaseName = data.phaseName;
    const durationMs = data.duration_ms;
    const readableName = PHASE_NAMES[phaseName] || phaseName;

    try {
      const mins = durationMs ? ` em ${Math.round(durationMs / 60000)} min` : '';
      await this.notion.addComment(
        mapping.pageId,
        `━ Fase "${readableName}" concluída${mins}`,
      );
    } catch {
      // Fire-and-forget
    }
  }

  /**
   * Handle run.completed event — mark task as Done
   */
  async onRunCompleted(runId, data = {}) {
    if (!this.enabled) return;

    const mapping = this.runTaskMap.get(runId);
    if (!mapping) return;

    try {
      await this.notion.updateTask(mapping.pageId, { status: 'Done' });

      const totalMs = data.total_duration_ms || 0;
      const mins = Math.round(totalMs / 60000);
      const outputs = data.outputs_count || 0;

      let summary = 'Produção finalizada com sucesso.';
      if (outputs > 0) summary += ` ${outputs} criativos gerados.`;
      if (mins > 0) summary += ` Tempo total: ${mins} minutos.`;

      await this.notion.addComment(mapping.pageId, summary);
    } catch (error) {
      console.warn(`[NotionSync] Failed to complete run ${runId}:`, error.message);
    } finally {
      this.runTaskMap.delete(runId);
    }
  }

  /**
   * Handle run.failed event — mark task as Blocked
   */
  async onRunFailed(runId, data = {}) {
    if (!this.enabled) return;

    const mapping = this.runTaskMap.get(runId);
    if (!mapping) return;

    try {
      await this.notion.updateTask(mapping.pageId, { status: 'Blocked' });

      const failedStep = data.failed_step || 'desconhecido';
      const errorMsg = this._simplifyError(data.error);

      await this.notion.addComment(
        mapping.pageId,
        `Produção parou no passo "${STEP_NAMES[failedStep] || failedStep}". Motivo: ${errorMsg}. Aguardando revisão.`,
      );
    } catch (error) {
      console.warn(`[NotionSync] Failed to mark run ${runId} as failed:`, error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          DISPATCHER
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Route an event to the appropriate handler.
   * Called by SquadOrchestrator after each eventStore.append().
   *
   * @param {string} eventType - Event type (e.g., 'run.started')
   * @param {string} runId - Run ID
   * @param {Object} data - Event data
   */
  async dispatch(eventType, runId, data) {
    if (!this.enabled) return;

    switch (eventType) {
      case 'run.started':
        return this.onRunStarted(runId, data);
      case 'step.completed':
        return this.onStepCompleted(runId, data);
      case 'phase.completed':
        return this.onPhaseCompleted(runId, data);
      case 'run.completed':
        return this.onRunCompleted(runId, data);
      case 'run.failed':
        return this.onRunFailed(runId, data);
      default:
        // Other events — no Notion action needed
        return;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Build a human-readable task title
   */
  _buildTaskTitle(squadId, offerId) {
    const squadNames = {
      'squad-copy': 'Produção Criativa',
      'media-squad': 'Gestão de Mídia',
    };
    const squad = squadNames[squadId] || squadId;
    return offerId ? `${squad} — ${offerId}` : squad;
  }

  /**
   * Convert step completion to human-readable log entry
   */
  _toHumanReadable(stepId, durationMs) {
    const name = STEP_NAMES[stepId];
    if (!name) return null; // Skip unknown/internal steps

    const secs = durationMs ? ` (${Math.round(durationMs / 1000)}s)` : '';
    return `✓ ${name}${secs}`;
  }

  /**
   * Simplify a technical error message for non-technical audience
   */
  _simplifyError(error) {
    if (!error) return 'erro desconhecido';
    const msg = typeof error === 'string' ? error : error.message || String(error);

    if (msg.includes('_parseError')) return 'resposta da IA não foi compreendida';
    if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) return 'tempo esgotado';
    if (msg.includes('rate_limit') || msg.includes('429')) return 'limite de requisições atingido';
    if (msg.includes('ECONNREFUSED')) return 'serviço indisponível';
    if (msg.includes('401') || msg.includes('403')) return 'problema de autenticação';
    return 'erro técnico — verificar logs';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  NotionSync,
  STEP_NAMES,
  PHASE_NAMES,
  SQUAD_SUBTASKS,
};
