/**
 * Jarvis Command Parser
 *
 * Detects command intent from natural language chat messages
 * and maps them to executable actions (squad runs, status checks,
 * delegation controls, briefings).
 *
 * Used by: Jarvis chat route (tool use) and direct API calls
 *
 * @module core/intelligence/jarvis-command-parser
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              COMMAND DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Supported command actions
 */
const ACTIONS = {
  RUN_SQUAD: 'run_squad',
  CHECK_STATUS: 'check_status',
  CONTROL_RUN: 'control_run',
  MORNING_BRIEF: 'morning_brief',
  DELEGATE_TASK: 'delegate_task',
  LIST_OFFERS: 'list_offers',
  LIST_SQUADS: 'list_squads',
  CREATE_NOTION_TASK: 'create_notion_task',
  LIST_NOTION_TASKS: 'list_notion_tasks',
  UPDATE_NOTION_TASK: 'update_notion_task',
};

/**
 * Squad aliases for natural language matching
 */
const SQUAD_ALIASES = {
  'squad-copy': ['squad-copy', 'squad copy', 'copy', 'criativo', 'criativos', 'creative'],
  'media-squad': ['media-squad', 'media squad', 'media', 'trafego', 'traffic', 'campanha', 'campaign'],
};

/**
 * Control commands
 */
const CONTROL_COMMANDS = {
  pause: ['pausa', 'pause', 'pausar', 'para', 'stop'],
  resume: ['resume', 'retomar', 'continua', 'continuar', 'volta'],
  abort: ['abort', 'aborta', 'abortar', 'cancela', 'cancelar', 'cancel'],
};

// ═══════════════════════════════════════════════════════════════════════════════
//                              PARSER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class JarvisCommandParser {
  /**
   * Parse a natural language message into a structured command
   *
   * @param {string} message - User message in natural language
   * @returns {Object|null} Parsed command or null if no command detected
   */
  parse(message) {
    if (!message || typeof message !== 'string') return null;

    const normalized = message.toLowerCase().trim();

    // Try each parser in priority order
    return (
      this._parseRunSquad(normalized, message) ||
      this._parseControlRun(normalized) ||
      this._parseCheckStatus(normalized) ||
      this._parseMorningBrief(normalized) ||
      this._parseListOffers(normalized) ||
      this._parseListSquads(normalized) ||
      this._parseDelegateTask(normalized, message) ||
      this._parseCreateNotionTask(normalized, message) ||
      this._parseListNotionTasks(normalized) ||
      null
    );
  }

  /**
   * Detect "run squad" intent
   *
   * Examples:
   * - "Roda o squad-copy pra MEMFR02"
   * - "Executa criativos para GP01"
   * - "Gera criativos da oferta MEMFR02"
   * - "Run squad copy for MEMFR02"
   *
   * @private
   */
  _parseRunSquad(normalized, original) {
    // Pattern: run/execute/generate + squad/creative + offer
    const runPatterns = [
      /(?:roda|rodar|executa|executar|run|start|inicia|iniciar|gera|gerar|cria|criar)\s+(?:o\s+)?(?:squad[- ]?)?(\w[\w-]*)\s+(?:pra|para|for|da\s+oferta|offer)\s+(\w+)/i,
      /(?:roda|rodar|executa|executar|run|start)\s+(?:o\s+)?(\w[\w-]*)\s+(\w+)/i,
      /(?:gera|gerar|cria|criar)\s+(?:os?\s+)?(?:criativos?|copies|scripts?)\s+(?:pra|para|for|da|do)\s+(\w+)/i,
    ];

    for (const pattern of runPatterns) {
      const match = original.match(pattern);
      if (match) {
        // Last pattern only captures offerId
        if (match.length === 2) {
          return {
            action: ACTIONS.RUN_SQUAD,
            squad: 'squad-copy',
            params: { offerId: match[1].toUpperCase() },
          };
        }

        const squadInput = match[1].toLowerCase();
        const offerId = match[2].toUpperCase();
        const squadId = this._resolveSquadAlias(squadInput);

        if (squadId) {
          return {
            action: ACTIONS.RUN_SQUAD,
            squad: squadId,
            params: { offerId },
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect "control run" intent (pause/resume/abort)
   * @private
   */
  _parseControlRun(normalized) {
    for (const [command, aliases] of Object.entries(CONTROL_COMMANDS)) {
      for (const alias of aliases) {
        if (normalized.includes(alias)) {
          // Try to extract run ID
          const runIdMatch = normalized.match(/run[- _]?([a-z0-9-]+)/i);
          return {
            action: ACTIONS.CONTROL_RUN,
            command,
            runId: runIdMatch ? runIdMatch[1] : null,
          };
        }
      }
    }
    return null;
  }

  /**
   * Detect "check status" intent
   * @private
   */
  _parseCheckStatus(normalized) {
    const statusPatterns = [
      /(?:como\s+(?:ta|est[aá])|status|what.?s?\s+the\s+status|check)/,
      /(?:como\s+(?:vai|anda)|progress|andamento)/,
      /(?:j[aá]\s+terminou|finished|done|pronto)/,
    ];

    for (const pattern of statusPatterns) {
      if (pattern.test(normalized)) {
        // Try to extract squad or run reference
        const squadMatch = this._findSquadInText(normalized);
        const runIdMatch = normalized.match(/run[- _]?([a-z0-9-]+)/i);

        return {
          action: ACTIONS.CHECK_STATUS,
          squad: squadMatch,
          runId: runIdMatch ? runIdMatch[1] : null,
        };
      }
    }

    return null;
  }

  /**
   * Detect "morning brief" intent
   * @private
   */
  _parseMorningBrief(normalized) {
    const briefPatterns = [
      /(?:briefing|brief|bom\s+dia|good\s+morning)/,
      /(?:ressum[eo]|resumo|summary|overview)/,
      /(?:o\s+que\s+(?:tem|temos)|what.?s?\s+(?:up|new|happening))/,
    ];

    for (const pattern of briefPatterns) {
      if (pattern.test(normalized)) {
        return { action: ACTIONS.MORNING_BRIEF };
      }
    }

    return null;
  }

  /**
   * Detect "list offers" intent
   * @private
   */
  _parseListOffers(normalized) {
    if (/(?:lista|list|quais|mostra|show)\s+(?:as\s+)?(?:ofertas|offers)/.test(normalized)) {
      return { action: ACTIONS.LIST_OFFERS };
    }
    return null;
  }

  /**
   * Detect "list squads" intent
   * @private
   */
  _parseListSquads(normalized) {
    if (/(?:lista|list|quais|mostra|show)\s+(?:os\s+)?(?:squads?|equipes?)/.test(normalized)) {
      return { action: ACTIONS.LIST_SQUADS };
    }
    return null;
  }

  /**
   * Detect general delegation intent
   * @private
   */
  _parseDelegateTask(normalized, original) {
    // Pattern: "pede pro @agent fazer X" or "delegate X to @agent"
    const delegatePatterns = [
      /(?:pede|peça|ask|delegate|manda|envia)\s+(?:pro?|para?|to)\s+@?(\w[\w-]*)\s+(.+)/i,
      /@(\w[\w-]*)\s+(.+)/i,
    ];

    for (const pattern of delegatePatterns) {
      const match = original.match(pattern);
      if (match) {
        return {
          action: ACTIONS.DELEGATE_TASK,
          agent: match[1],
          task: match[2].trim(),
        };
      }
    }

    return null;
  }

  /**
   * Detect "create Notion task" intent
   * @private
   */
  _parseCreateNotionTask(normalized, original) {
    const patterns = [
      /(?:cria|criar|add|adiciona|anota|anotar|registra|registrar)\s+(?:uma?\s+)?(?:task|tarefa|nota|todo|lembrete)\s*:?\s*(.+)/i,
      /(?:lembra|lembrar|lembre)\s+(?:de\s+)?(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = original.match(pattern);
      if (match) {
        return {
          action: ACTIONS.CREATE_NOTION_TASK,
          title: match[1].trim(),
        };
      }
    }
    return null;
  }

  /**
   * Detect "list Notion tasks" intent
   * @private
   */
  _parseListNotionTasks(normalized) {
    const patterns = [
      /(?:lista|list|quais|mostra|show)\s+(?:as\s+)?(?:tasks?|tarefas?|todos?|pendências)/,
      /(?:o\s+que\s+(?:tem|temos)\s+(?:pendente|pra\s+fazer|pra\s+hoje))/,
    ];

    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return { action: ACTIONS.LIST_NOTION_TASKS };
      }
    }
    return null;
  }

  /**
   * Resolve squad alias to squad ID
   * @private
   */
  _resolveSquadAlias(input) {
    for (const [squadId, aliases] of Object.entries(SQUAD_ALIASES)) {
      if (aliases.some((alias) => input.includes(alias))) {
        return squadId;
      }
    }
    return null;
  }

  /**
   * Find squad reference in text
   * @private
   */
  _findSquadInText(text) {
    for (const [squadId, aliases] of Object.entries(SQUAD_ALIASES)) {
      if (aliases.some((alias) => text.includes(alias))) {
        return squadId;
      }
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          TOOL DEFINITIONS (for Claude)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tool definitions for Claude's tool_use feature
 * These are passed to the Jarvis chat API for function calling
 */
const JARVIS_TOOLS = [
  {
    name: 'run_squad',
    description: 'Execute a squad pipeline. Use when the user wants to run a creative production squad (squad-copy) or media buying squad (media-squad) for a specific offer.',
    input_schema: {
      type: 'object',
      properties: {
        squad_id: {
          type: 'string',
          description: 'Squad identifier: "squad-copy" for creative production, "media-squad" for media buying',
          enum: ['squad-copy', 'media-squad'],
        },
        offer_id: {
          type: 'string',
          description: 'Offer ID (e.g., "MEMFR02", "GP01")',
        },
        pipeline: {
          type: 'string',
          description: 'Pipeline name. Default: "default-pipeline"',
        },
      },
      required: ['squad_id', 'offer_id'],
    },
  },
  {
    name: 'check_status',
    description: 'Check the status of a running or completed squad execution. Use when the user asks about progress, status, or results of a run.',
    input_schema: {
      type: 'object',
      properties: {
        run_id: {
          type: 'string',
          description: 'Run ID to check. If not provided, returns status of the most recent run.',
        },
        squad_id: {
          type: 'string',
          description: 'Filter by squad ID',
        },
      },
    },
  },
  {
    name: 'control_run',
    description: 'Control an active squad execution: pause, resume, or abort it.',
    input_schema: {
      type: 'object',
      properties: {
        run_id: {
          type: 'string',
          description: 'Run ID to control',
        },
        action: {
          type: 'string',
          description: 'Control action',
          enum: ['pause', 'resume', 'abort'],
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'morning_brief',
    description: 'Generate a morning briefing with status of all active delegations, recent results, and attention items. Use when the user says good morning, asks for a summary, or wants an overview.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'delegate_task',
    description: 'Delegate a specific task to an agent. Use for tasks that require a specialized agent but are not full squad pipelines.',
    input_schema: {
      type: 'object',
      properties: {
        agent: {
          type: 'string',
          description: 'Agent name (e.g., "stefan-georgi", "copy-chief", "media-head")',
        },
        task: {
          type: 'string',
          description: 'Task to execute',
        },
        inputs: {
          type: 'object',
          description: 'Input data for the task',
        },
      },
      required: ['agent', 'task'],
    },
  },
  {
    name: 'create_notion_task',
    description: 'Create a task in Notion. Use when the user wants to create a to-do, reminder, or task to track.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title',
        },
        description: {
          type: 'string',
          description: 'Task description',
        },
        priority: {
          type: 'string',
          description: 'Task priority',
          enum: ['Urgent', 'High', 'Medium', 'Low'],
        },
        due_date: {
          type: 'string',
          description: 'Due date in ISO format (YYYY-MM-DD)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags/labels for the task',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_notion_tasks',
    description: 'List tasks from Notion. Use when the user asks about pending tasks, to-dos, or what needs to be done.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status',
          enum: ['To Do', 'In Progress', 'Done', 'Blocked'],
        },
        priority: {
          type: 'string',
          description: 'Filter by priority',
          enum: ['Urgent', 'High', 'Medium', 'Low'],
        },
      },
    },
  },
  {
    name: 'update_notion_task',
    description: 'Update a Notion task status or priority.',
    input_schema: {
      type: 'object',
      properties: {
        page_id: {
          type: 'string',
          description: 'Notion page ID',
        },
        status: {
          type: 'string',
          description: 'New status',
          enum: ['To Do', 'In Progress', 'Done', 'Blocked', 'Cancelled'],
        },
        priority: {
          type: 'string',
          description: 'New priority',
          enum: ['Urgent', 'High', 'Medium', 'Low'],
        },
      },
      required: ['page_id'],
    },
  },
];

module.exports = {
  JarvisCommandParser,
  JARVIS_TOOLS,
  ACTIONS,
  SQUAD_ALIASES,
};
