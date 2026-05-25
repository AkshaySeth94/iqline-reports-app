/**
 * The deployment timestamp used to anchor the JWT v2 grace window.
 * In production this should be set via JWT_V2_DEPLOY_TIMESTAMP env var to the
 * exact deploy time; otherwise the grace window opens fresh on every restart
 * (acceptable for dev/staging — re-login required after restart+24h).
 */
export const JWT_V2_DEPLOY_TIMESTAMP = process.env.JWT_V2_DEPLOY_TIMESTAMP
  ? Number(process.env.JWT_V2_DEPLOY_TIMESTAMP)
  : Date.now();
