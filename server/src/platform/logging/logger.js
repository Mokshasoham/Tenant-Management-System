import { logContextStore } from './logContext.js';

const LogLevels = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5
};

const getLogLevelThreshold = () => {
  const envLevel = (process.env.LOG_LEVEL || 'info').toUpperCase();
  return LogLevels[envLevel] !== undefined ? LogLevels[envLevel] : LogLevels.INFO;
};

const formatMessage = (level, message, meta) => {
  const context = logContextStore.getStore() || {};
  const threshold = getLogLevelThreshold();
  const levelValue = LogLevels[level];
  
  if (levelValue < threshold) return null;

  const logPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.NODE_ENV || 'development',
    requestId: context.requestId,
    correlationId: context.correlationId,
    userId: context.userId || 'anonymous',
    organizationId: context.organizationId || null,
    module: context.module || 'system',
    action: context.action || null,
    tenantRole: context.tenantRole || null,
    duration: context.requestStartTime ? `${Date.now() - context.requestStartTime}ms` : null,
    meta: meta || {}
  };

  return JSON.stringify(logPayload);
};

const logger = {
  trace(msg, meta = '') {
    const formatted = formatMessage('TRACE', msg, meta);
    if (formatted) console.log(formatted);
  },
  debug(msg, meta = '') {
    const formatted = formatMessage('DEBUG', msg, meta);
    if (formatted) console.log(formatted);
  },
  info(msg, meta = '') {
    const formatted = formatMessage('INFO', msg, meta);
    if (formatted) console.log(formatted);
  },
  warn(msg, meta = '') {
    const formatted = formatMessage('WARN', msg, meta);
    if (formatted) console.warn(formatted);
  },
  error(msg, meta = '') {
    const formatted = formatMessage('ERROR', msg, meta);
    if (formatted) console.error(formatted);
  },
  fatal(msg, meta = '') {
    const formatted = formatMessage('FATAL', msg, meta);
    if (formatted) console.error(formatted);
  }
};

export default logger;
export { LogLevels };
