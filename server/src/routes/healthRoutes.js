import express from 'express';
import mongoose from 'mongoose';
import container from '../platform/container.js';
import { PLATFORM_VERSION, APPLICATION_VERSION, NODE_VERSION, GIT_COMMIT, BUILD_TIME, ENVIRONMENT } from '../platform/version.js';

const router = express.Router();

const getDBHealth = async () => {
  const dbStart = Date.now();
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      const latency = Date.now() - dbStart;
      return {
        status: 'UP',
        latencyMs: latency,
        lastChecked: new Date().toISOString(),
        version: mongoose.version,
        details: { databaseName: mongoose.connection.name }
      };
    }
    throw new Error('Database disconnected.');
  } catch (err) {
    return {
      status: 'DOWN',
      latencyMs: Date.now() - dbStart,
      lastChecked: new Date().toISOString(),
      version: mongoose.version,
      details: { error: err.message }
    };
  }
};

// 1. /live endpoint - Is the process alive? No connections queried. Always 200 OK.
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'UP',
    platformVersion: PLATFORM_VERSION,
    applicationVersion: APPLICATION_VERSION,
    nodeVersion: NODE_VERSION,
    gitCommit: GIT_COMMIT,
    buildTime: BUILD_TIME,
    environment: ENVIRONMENT,
    uptimeSec: process.uptime()
  });
});

// 2. /ready endpoint - Verifies external integrations are available
router.get('/ready', async (req, res) => {
  const dbHealth = await getDBHealth();
  
  let cacheHealth = { status: 'UP', latencyMs: 0, lastChecked: new Date().toISOString(), version: PLATFORM_VERSION, details: {} };
  let storageHealth = { status: 'UP', latencyMs: 0, lastChecked: new Date().toISOString(), version: PLATFORM_VERSION, details: {} };

  try {
    const cache = container.resolveCache();
    if (cache) cacheHealth = await cache.health();
  } catch {
    cacheHealth = { status: 'DOWN', latencyMs: 0, lastChecked: new Date().toISOString(), version: PLATFORM_VERSION, details: {} };
  }

  try {
    const storage = container.resolveStorage();
    if (storage) storageHealth = await storage.health();
  } catch {
    storageHealth = { status: 'DOWN', latencyMs: 0, lastChecked: new Date().toISOString(), version: PLATFORM_VERSION, details: {} };
  }

  const isReady = dbHealth.status === 'UP' && cacheHealth.status === 'UP' && storageHealth.status === 'UP';
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    status: isReady ? 'UP' : 'DOWN',
    platformVersion: PLATFORM_VERSION,
    applicationVersion: APPLICATION_VERSION,
    uptimeSec: process.uptime(),
    components: {
      database: dbHealth,
      cache: cacheHealth,
      storage: storageHealth
    }
  });
});

// 3. /health endpoint - Full diagnostics summary
router.get('/health', async (req, res) => {
  const dbHealth = await getDBHealth();
  
  let cacheHealth = { status: 'UP', latencyMs: 0, lastChecked: new Date().toISOString(), version: PLATFORM_VERSION, details: {} };
  let storageHealth = { status: 'UP', latencyMs: 0, lastChecked: new Date().toISOString(), version: PLATFORM_VERSION, details: {} };
  let jobsHealth = { status: 'UP', latencyMs: 0, lastChecked: new Date().toISOString(), version: PLATFORM_VERSION, details: {} };

  try {
    const cache = container.resolveCache();
    if (cache) cacheHealth = await cache.health();
  } catch {}

  try {
    const storage = container.resolveStorage();
    if (storage) storageHealth = await storage.health();
  } catch {}

  try {
    const jobs = container.resolveJobs();
    if (jobs) jobsHealth = await jobs.health();
  } catch {}

  const overallStatus = (dbHealth.status === 'UP' && cacheHealth.status === 'UP' && storageHealth.status === 'UP') ? 'UP' : 'DOWN';

  res.status(200).json({
    status: overallStatus,
    platformVersion: PLATFORM_VERSION,
    applicationVersion: APPLICATION_VERSION,
    nodeVersion: NODE_VERSION,
    gitCommit: GIT_COMMIT,
    buildTime: BUILD_TIME,
    environment: ENVIRONMENT,
    uptimeSec: process.uptime(),
    components: {
      database: dbHealth,
      cache: cacheHealth,
      storage: storageHealth,
      jobs: jobsHealth
    }
  });
});

// 4. /metrics endpoint - Metrics placeholder (Reserved for Prometheus/Grafana)
router.get('/metrics', (req, res) => {
  res.status(200).send(`
# HELP http_requests_total Total number of HTTP requests.
# TYPE http_requests_total counter
http_requests_total{method="GET",handler="/health"} 1
  `);
});

export default router;
