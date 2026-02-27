/**
 * Jarvis Workflows — Index
 *
 * Sprint 4 C.5: Workflow registry
 *
 * Exports all Jarvis workflows for use by the chat route
 * and other integration points.
 *
 * @module core/intelligence/jarvis-workflows
 */

const { DelegateWorkflow } = require('./delegate');
const { BriefWorkflow } = require('./brief');
const { MonitorWorkflow } = require('./monitor');

module.exports = {
  DelegateWorkflow,
  BriefWorkflow,
  MonitorWorkflow,
};
