/**
 * Notion Service
 *
 * Sprint 6 E.1: Integration with Notion API for task management.
 *
 * Provides:
 * - Create pages (tasks) in a database
 * - Update page properties (status, priority, etc.)
 * - Query pages by filter
 * - Search across workspace
 *
 * Env vars required:
 *   NOTION_API_KEY       - Notion integration token
 *   NOTION_DATABASE_ID   - Default database ID for tasks
 *
 * @module core/services/notion-service
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const NOTION_API_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';

const TASK_STATUS = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  BLOCKED: 'Blocked',
  CANCELLED: 'Cancelled',
};

const TASK_PRIORITY = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  URGENT: 'Urgent',
};

const TASK_TYPE = {
  TASK: 'Task',
  DELEGATION: 'Delegation',
  CAMPAIGN: 'Campaign',
  CREATIVE: 'Creative',
  ALERT: 'Alert',
  REVIEW: 'Review',
};

const TASK_SQUAD = {
  SQUAD_COPY: 'squad-copy',
  MEDIA_SQUAD: 'media-squad',
  JARVIS: 'jarvis',
  GENERAL: 'general',
};

const TASK_SOURCE = {
  JARVIS_CHAT: 'jarvis-chat',
  SQUAD_RUN: 'squad-run',
  MANUAL: 'manual',
  DAILY_OPTIMIZATION: 'daily-optimization',
};

// ═══════════════════════════════════════════════════════════════════════════════
//                              SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class NotionService {
  /**
   * @param {Object} [options]
   * @param {string} [options.apiKey] - Notion API key
   * @param {string} [options.databaseId] - Default database ID
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.NOTION_API_KEY;
    this.databaseId = options.databaseId || process.env.NOTION_DATABASE_ID;
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          TASKS (Pages)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Create a task (page) in the database
   *
   * @param {Object} params
   * @param {string} params.title - Task title
   * @param {string} [params.description] - Task description (rich text)
   * @param {string} [params.status='To Do'] - Task status
   * @param {string} [params.priority='Medium'] - Task priority
   * @param {string} [params.type='Task'] - Task type (Task, Delegation, Campaign, etc.)
   * @param {string} [params.squad] - Squad owner (squad-copy, media-squad, jarvis, general)
   * @param {string} [params.agent] - Agent that created this
   * @param {string} [params.offerId] - Related offer ID
   * @param {string} [params.source='manual'] - Origin (jarvis-chat, squad-run, etc.)
   * @param {string} [params.runId] - Related squad run ID
   * @param {string} [params.assignee] - Assigned person
   * @param {string} [params.dueDate] - Due date (ISO format)
   * @param {string[]} [params.tags] - Tags/labels
   * @returns {Promise<Object>} Created page
   *
   * RULE: All agent tasks MUST be created in the AIOS Command Center database.
   * The database ID is always resolved from this.databaseId (env NOTION_DATABASE_ID).
   * No per-call override is allowed to prevent tasks leaking into other databases.
   */
  async createTask(params) {
    const {
      title,
      description,
      status = TASK_STATUS.TODO,
      priority = TASK_PRIORITY.MEDIUM,
      type,
      squad,
      agent,
      offerId,
      source,
      runId,
      assignee,
      dueDate,
      tags = [],
    } = params;

    const properties = {
      Name: {
        title: [{ text: { content: title } }],
      },
      Status: {
        select: { name: status },
      },
      Priority: {
        select: { name: priority },
      },
    };

    if (type) {
      properties.Type = { select: { name: type } };
    }

    if (squad) {
      properties.Squad = { select: { name: squad } };
    }

    if (agent) {
      properties.Agent = {
        rich_text: [{ text: { content: agent } }],
      };
    }

    if (offerId) {
      properties.Offer = {
        rich_text: [{ text: { content: offerId } }],
      };
    }

    if (source) {
      properties.Source = { select: { name: source } };
    }

    if (runId) {
      properties['Run ID'] = {
        rich_text: [{ text: { content: runId } }],
      };
    }

    if (assignee) {
      properties.Assignee = {
        rich_text: [{ text: { content: assignee } }],
      };
    }

    if (dueDate) {
      properties['Due Date'] = {
        date: { start: dueDate },
      };
    }

    if (tags.length > 0) {
      properties.Tags = {
        multi_select: tags.map(tag => ({ name: tag })),
      };
    }

    // RULE: Always use AIOS Command Center database — no per-call override
    if (!this.databaseId) {
      throw new Error(
        'NOTION_DATABASE_ID not configured. All tasks must go to the AIOS Command Center database.'
      );
    }

    const body = {
      parent: { database_id: this.databaseId },
      properties,
    };

    // Add description as page content
    if (description) {
      body.children = [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: description } }],
          },
        },
      ];
    }

    return await this._apiPost('/pages', body);
  }

  /**
   * Update task properties
   *
   * @param {string} pageId - Notion page ID
   * @param {Object} updates - Properties to update
   * @param {string} [updates.title] - New title
   * @param {string} [updates.status] - New status
   * @param {string} [updates.priority] - New priority
   * @param {string} [updates.assignee] - New assignee
   * @param {string} [updates.dueDate] - New due date
   * @param {string[]} [updates.tags] - New tags
   * @returns {Promise<Object>} Updated page
   */
  async updateTask(pageId, updates) {
    const properties = {};

    if (updates.title) {
      properties.Name = {
        title: [{ text: { content: updates.title } }],
      };
    }

    if (updates.status) {
      properties.Status = {
        select: { name: updates.status },
      };
    }

    if (updates.priority) {
      properties.Priority = {
        select: { name: updates.priority },
      };
    }

    if (updates.assignee) {
      properties.Assignee = {
        rich_text: [{ text: { content: updates.assignee } }],
      };
    }

    if (updates.dueDate) {
      properties['Due Date'] = {
        date: { start: updates.dueDate },
      };
    }

    if (updates.tags) {
      properties.Tags = {
        multi_select: updates.tags.map(tag => ({ name: tag })),
      };
    }

    return await this._apiPatch(`/pages/${pageId}`, { properties });
  }

  /**
   * Get a single task by page ID
   *
   * @param {string} pageId - Notion page ID
   * @returns {Promise<Object>} Page data
   */
  async getTask(pageId) {
    return await this._apiGet(`/pages/${pageId}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          QUERY & SEARCH
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Query tasks from database with filters
   *
   * @param {Object} [options]
   * @param {string} [options.status] - Filter by status
   * @param {string} [options.priority] - Filter by priority
   * @param {string} [options.assignee] - Filter by assignee
   * @param {string} [options.tag] - Filter by tag
   * @param {number} [options.limit=100] - Max results
   * @returns {Promise<Object>} Query results
   *
   * RULE: Always queries AIOS Command Center database — no per-call override.
   */
  async queryTasks(options = {}) {
    const { status, priority, assignee, tag, limit = 100 } = options;

    const filter = { and: [] };

    if (status) {
      filter.and.push({
        property: 'Status',
        select: { equals: status },
      });
    }

    if (priority) {
      filter.and.push({
        property: 'Priority',
        select: { equals: priority },
      });
    }

    if (assignee) {
      filter.and.push({
        property: 'Assignee',
        rich_text: { contains: assignee },
      });
    }

    if (tag) {
      filter.and.push({
        property: 'Tags',
        multi_select: { contains: tag },
      });
    }

    const body = {
      page_size: Math.min(limit, 100),
      sorts: [{ property: 'Priority', direction: 'ascending' }],
    };

    if (filter.and.length > 0) {
      body.filter = filter.and.length === 1 ? filter.and[0] : filter;
    }

    const result = await this._apiPost(`/databases/${this.databaseId}/query`, body);

    return {
      tasks: (result.results || []).map(page => this._parsePage(page)),
      hasMore: result.has_more,
      nextCursor: result.next_cursor,
      total: (result.results || []).length,
    };
  }

  /**
   * Search across workspace
   *
   * @param {string} query - Search query
   * @param {Object} [options]
   * @param {string} [options.filter] - 'page' or 'database'
   * @param {number} [options.limit=10]
   * @returns {Promise<Object>} Search results
   */
  async search(query, options = {}) {
    const body = {
      query,
      page_size: options.limit || 10,
    };

    if (options.filter) {
      body.filter = { value: options.filter, property: 'object' };
    }

    const result = await this._apiPost('/search', body);

    return {
      results: (result.results || []).map(page => this._parsePage(page)),
      hasMore: result.has_more,
      total: (result.results || []).length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          DATABASE
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get database schema
   *
   * @returns {Promise<Object>} Database info with properties
   *
   * RULE: Always reads AIOS Command Center schema — no per-call override.
   */
  async getDatabaseSchema() {
    const result = await this._apiGet(`/databases/${this.databaseId}`);

    return {
      id: result.id,
      title: result.title?.[0]?.plain_text || 'Untitled',
      properties: Object.entries(result.properties || {}).map(([name, prop]) => ({
        name,
        type: prop.type,
        id: prop.id,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //                      SUBTASKS (Block Children)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Add subtasks (to_do blocks) as children of a page
   *
   * @param {string} pageId - Notion page ID
   * @param {Array<{text: string, checked?: boolean}>} subtasks - Subtask list
   * @returns {Promise<Object>} Created blocks
   */
  async addSubtasks(pageId, subtasks) {
    if (!pageId) throw new Error('pageId is required');
    if (!subtasks?.length) return { results: [] };

    const children = subtasks.map(sub => ({
      object: 'block',
      type: 'to_do',
      to_do: {
        rich_text: [{ type: 'text', text: { content: sub.text || sub } }],
        checked: sub.checked || false,
      },
    }));

    return await this._apiPatch(`/blocks/${pageId}/children`, { children });
  }

  /**
   * Get subtasks (to_do blocks) from a page
   *
   * @param {string} pageId - Notion page ID
   * @returns {Promise<Array<{id: string, text: string, checked: boolean}>>}
   */
  async getSubtasks(pageId) {
    if (!pageId) throw new Error('pageId is required');

    const result = await this._apiGet(`/blocks/${pageId}/children?page_size=100`);
    const blocks = result.results || [];

    return blocks
      .filter(b => b.type === 'to_do')
      .map(b => ({
        id: b.id,
        text: b.to_do?.rich_text?.map(r => r.plain_text).join('') || '',
        checked: b.to_do?.checked || false,
      }));
  }

  /**
   * Update a subtask block (mark as checked/unchecked)
   *
   * @param {string} blockId - Notion block ID
   * @param {boolean} checked - Whether the subtask is done
   * @returns {Promise<Object>} Updated block
   */
  async updateSubtask(blockId, checked) {
    if (!blockId) throw new Error('blockId is required');

    return await this._apiPatch(`/blocks/${blockId}`, {
      to_do: { checked },
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          COMMENTS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Add a comment to a page
   *
   * @param {string} pageId - Notion page ID
   * @param {string} text - Comment text
   * @returns {Promise<Object>} Created comment
   */
  async addComment(pageId, text) {
    if (!pageId) throw new Error('pageId is required');
    if (!text) throw new Error('text is required');

    return await this._apiPost('/comments', {
      parent: { page_id: pageId },
      rich_text: [{ type: 'text', text: { content: text } }],
    });
  }

  /**
   * Add a comment with @mention to a page
   *
   * @param {string} pageId - Notion page ID
   * @param {string} userId - Notion user UUID to mention
   * @param {string} text - Comment text (appears after the @mention)
   * @returns {Promise<Object>} Created comment
   */
  async addCommentWithMention(pageId, userId, text) {
    if (!pageId) throw new Error('pageId is required');
    if (!userId) throw new Error('userId is required');
    if (!text) throw new Error('text is required');

    return await this._apiPost('/comments', {
      parent: { page_id: pageId },
      rich_text: [
        {
          type: 'mention',
          mention: { type: 'user', user: { id: userId } },
        },
        {
          type: 'text',
          text: { content: ` ${text}` },
        },
      ],
    });
  }

  /**
   * Get comments for a page
   *
   * @param {string} pageId - Notion page ID
   * @returns {Promise<Array<{id: string, text: string, createdAt: string}>>}
   */
  async getComments(pageId) {
    if (!pageId) throw new Error('pageId is required');

    const result = await this._apiGet(`/comments?block_id=${pageId}`);
    return (result.results || []).map(c => ({
      id: c.id,
      text: c.rich_text?.map(r => r.plain_text).join('') || '',
      createdAt: c.created_time,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Check service health
   *
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    if (!this.apiKey) {
      return { healthy: false, error: 'NOTION_API_KEY not configured' };
    }
    if (!this.databaseId) {
      return { healthy: false, error: 'NOTION_DATABASE_ID not configured' };
    }

    try {
      const db = await this.getDatabaseSchema();
      return {
        healthy: true,
        databaseTitle: db.title,
        propertiesCount: db.properties.length,
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          PRIVATE: API
  // ═══════════════════════════════════════════════════════════════════

  /** @private */
  _getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_API_VERSION,
    };
  }

  /** @private */
  async _apiGet(endpoint) {
    const res = await fetch(`${NOTION_API_BASE}${endpoint}`, {
      headers: this._getHeaders(),
    });

    const data = await res.json();
    if (data.object === 'error') {
      throw new Error(`Notion API Error: ${data.message} (${data.code})`);
    }
    return data;
  }

  /** @private */
  async _apiPost(endpoint, body) {
    const res = await fetch(`${NOTION_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.object === 'error') {
      throw new Error(`Notion API Error: ${data.message} (${data.code})`);
    }
    return data;
  }

  /** @private */
  async _apiPatch(endpoint, body) {
    const res = await fetch(`${NOTION_API_BASE}${endpoint}`, {
      method: 'PATCH',
      headers: this._getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.object === 'error') {
      throw new Error(`Notion API Error: ${data.message} (${data.code})`);
    }
    return data;
  }

  /**
   * Parse a Notion page into a simplified task object
   * @private
   */
  _parsePage(page) {
    const props = page.properties || {};

    return {
      id: page.id,
      title: props.Name?.title?.[0]?.plain_text || 'Untitled',
      status: props.Status?.select?.name || null,
      priority: props.Priority?.select?.name || null,
      type: props.Type?.select?.name || null,
      squad: props.Squad?.select?.name || null,
      agent: props.Agent?.rich_text?.[0]?.plain_text || null,
      offerId: props.Offer?.rich_text?.[0]?.plain_text || null,
      source: props.Source?.select?.name || null,
      runId: props['Run ID']?.rich_text?.[0]?.plain_text || null,
      assignee: props.Assignee?.rich_text?.[0]?.plain_text || null,
      dueDate: props['Due Date']?.date?.start || null,
      tags: (props.Tags?.multi_select || []).map(t => t.name),
      url: page.url,
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  NotionService,
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_TYPE,
  TASK_SQUAD,
  TASK_SOURCE,
  NOTION_API_VERSION,
};
