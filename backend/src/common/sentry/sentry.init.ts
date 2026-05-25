// Sentry initialization (NFR-O2). No-op when SENTRY_DSN is unset (dev-friendly).
// Uses dynamic require so the dependency is optional at runtime.
import { Logger } from '@nestjs/common';

const logger = new Logger('Sentry');
let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.log('SENTRY_DSN unset — Sentry disabled');
    return;
  }
  try {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0,
    });
    initialized = true;
    logger.log('Sentry initialized');
  } catch (err) {
    logger.warn(
      `Sentry SDK not installed — install @sentry/node to enable. (${(err as Error).message})`,
    );
  }
}

export function captureException(err: unknown, context?: Record<string, any>): void {
  if (!initialized) return;
  try {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const Sentry = require('@sentry/node');
    if (context) Sentry.setContext('extra', context);
    Sentry.captureException(err);
  } catch {
    // swallow
  }
}
