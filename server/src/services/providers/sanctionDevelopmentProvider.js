import { SanctionProvider } from './sanctionProvider.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';

export class SanctionDevelopmentProvider extends SanctionProvider {
  async screenEntity(verificationId, entityData = {}, metadata = {}) {
    logger.info(`[SanctionDevelopmentProvider] Executing sandbox screening for ${verificationId}`);

    if (metadata.forceTimeout) {
      logger.warn('[SanctionDevelopmentProvider] Simulated provider timeout');
      const err = new Error('Provider request timed out');
      err.name = 'AbortError';
      throw err;
    }

    if (metadata.forceError) {
      logger.error('[SanctionDevelopmentProvider] Simulated provider 500 failure');
      throw new AppError('External sanctions screening provider service unavailable', 502);
    }

    const matches = [];
    const legalName = entityData.legalName || 'JOHN DOE';

    if (metadata.simulationScenario === 'SIM_SANCTION_MATCH' || legalName.toUpperCase().includes('SANCTION')) {
      matches.push({
        matchId: 'MATCH-SANC-DEV-1',
        matchType: 'SANCTION_MATCH',
        listName: 'OFAC Specially Designated Nationals List',
        matchedName: 'VLADIMIR SANCTIONOV',
        similarityScore: 92,
        country: 'RU',
        anonymizedReference: 'SANCTION-MATCH-DEV-SDN-1',
        sourceProvider: 'DevelopmentWatchlistAdapter',
        sourceList: 'OFAC_SDN',
        sourceType: 'SANCTIONS_LIST',
        sourceRecordReference: 'SDN-REC-DEV-1-OPAQUE',
        sourceRetrievedAt: new Date('2026-01-01'),
        sourcePolicyVersion: 'v1.0',
      });
    } else if (metadata.simulationScenario === 'SIM_PEP_MATCH' || legalName.toUpperCase().includes('MINISTER')) {
      matches.push({
        matchId: 'MATCH-PEP-DEV-1',
        matchType: 'PEP_MATCH',
        listName: 'Global PEP & Government Official Directory',
        matchedName: 'MINISTER ALEXANDER DOE',
        similarityScore: 88,
        country: 'IN',
        anonymizedReference: 'SANCTION-MATCH-DEV-PEP-1',
        sourceProvider: 'DevelopmentWatchlistAdapter',
        sourceList: 'GLOBAL_PEP',
        sourceType: 'PEP_REGISTRY',
        sourceRecordReference: 'PEP-REC-DEV-1-OPAQUE',
        sourceRetrievedAt: new Date('2026-01-01'),
        sourcePolicyVersion: 'v1.0',
      });
    } else if (metadata.simulationScenario === 'SIM_RCA_MATCH') {
      matches.push({
        matchId: 'MATCH-RCA-DEV-1',
        matchType: 'RCA_MATCH',
        listName: 'Relatives & Close Associates Registry',
        matchedName: 'ELIZABETH DOE',
        similarityScore: 82,
        country: 'IN',
        anonymizedReference: 'SANCTION-MATCH-DEV-RCA-1',
        sourceProvider: 'DevelopmentWatchlistAdapter',
        sourceList: 'RCA_REGISTRY',
        sourceType: 'RCA_LIST',
        sourceRecordReference: 'RCA-REC-DEV-1-OPAQUE',
        sourceRetrievedAt: new Date('2026-01-01'),
        sourcePolicyVersion: 'v1.0',
      });
    } else if (metadata.simulationScenario === 'SIM_ADVERSE_MEDIA' || legalName.toUpperCase().includes('FRAUDSTER')) {
      matches.push({
        matchId: 'MATCH-ADV-DEV-1',
        matchType: 'ADVERSE_MEDIA_MATCH',
        listName: 'Financial Crime & Corruption Media Index',
        matchedName: 'JOHN FRAUDSTER',
        similarityScore: 85,
        country: 'IN',
        anonymizedReference: 'SANCTION-MATCH-DEV-ADV-1',
        sourceProvider: 'DevelopmentWatchlistAdapter',
        sourceList: 'ADVERSE_MEDIA_INDEX',
        sourceType: 'MEDIA_MONITOR',
        sourceRecordReference: 'ADV-REC-DEV-1-OPAQUE',
        sourceRetrievedAt: new Date('2026-01-01'),
        sourcePolicyVersion: 'v1.0',
        adverseMediaDetails: {
          sourceName: 'Financial Times Investigation',
          sourceUrl: 'https://example.com/investigation-notice',
          publicationDate: new Date('2025-06-15'),
          entityResolutionConfidence: 90,
          relevanceConfidence: 85,
          mediaCategory: 'FINANCIAL_CRIME',
          classification: 'INVESTIGATION',
        },
      });
    }

    return {
      success: true,
      provider: 'development',
      scanId: `SNC-DEV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      searchCorrelationId: `CORR-${Date.now()}`,
      matches,
      rawResponse: {
        sandbox: true,
        entityDataSubmitted: { legalName: entityData.legalName, country: entityData.country },
        matchedCount: matches.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async checkProviderHealth() {
    return { status: 'UP', mode: 'SANDBOX' };
  }
}
