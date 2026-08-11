import { FraudProvider } from './fraudProvider.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';

export class FraudDevelopmentProvider extends FraudProvider {
  async evaluateFraudRisk(verificationId, signals = [], metadata = {}) {
    logger.info(`[FraudDevelopmentProvider] Evaluating sandbox fraud risk for ${verificationId}`);

    if (metadata.forceTimeout) {
      logger.warn('[FraudDevelopmentProvider] Simulated provider timeout');
      const err = new Error('Provider request timed out');
      err.name = 'AbortError';
      throw err;
    }

    if (metadata.forceError) {
      logger.error('[FraudDevelopmentProvider] Simulated provider 500 failure');
      throw new AppError('External fraud provider service unavailable', 502);
    }

    let riskScore = 5;
    let providerStatus = 'SUCCESS';

    if (metadata.forceDocReuse) {
      riskScore = 80;
    } else if (metadata.forceDeepfake) {
      riskScore = 85;
    } else if (signals.length > 0) {
      const highestImpact = Math.max(...signals.map((s) => s.scoreImpact || 0));
      riskScore = Math.min(100, 10 + highestImpact);
    }

    return {
      success: true,
      provider: 'development',
      providerScanId: `FRD-DEV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      providerRiskScore: riskScore,
      providerStatus,
      rawResponse: {
        sandbox: true,
        evaluatedSignalsCount: signals.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async checkProviderHealth() {
    return { status: 'UP', mode: 'SANDBOX' };
  }
}
