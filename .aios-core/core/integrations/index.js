/**
 * Integrations — Barrel Export
 *
 * All external API integration clients.
 *
 * Story 2.5: External API Integrations
 *
 * @module integrations
 */

const { ImageGeneratorClient, ConfigError, PROVIDER_MAP, FORBIDDEN_TERMS } = require('./image-generators/client');
const { DallEProvider } = require('./image-generators/providers/dall-e');
const { MidJourneyProvider } = require('./image-generators/providers/midjourney');
const { NanoBananaProvider } = require('./image-generators/providers/nanobanana');
const { FluxProvider } = require('./image-generators/providers/flux');
const { WhisperClient } = require('./whisper/client');
const { MetaAdLibraryClient } = require('./spy-scraping/meta-ad-library');
const { TikTokCreativeClient } = require('./spy-scraping/tiktok-creative');
const { Semaphore } = require('./spy-scraping/semaphore');
const { APIErrorLogger } = require('./api-error-logger');
const { withGracefulDegradation, isSkippedResult } = require('./graceful-degradation');

module.exports = {
  // Image Generation
  ImageGeneratorClient,
  DallEProvider,
  MidJourneyProvider,
  NanoBananaProvider,
  FluxProvider,
  ConfigError,
  PROVIDER_MAP,
  FORBIDDEN_TERMS,

  // Whisper
  WhisperClient,

  // Spy Scraping
  MetaAdLibraryClient,
  TikTokCreativeClient,
  Semaphore,

  // Shared utilities
  APIErrorLogger,
  withGracefulDegradation,
  isSkippedResult,
};
