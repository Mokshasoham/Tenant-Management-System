/**
 * server/src/services/assignment/algorithmRegistry.js
 * Stateless strategy registry for assignment algorithms.
 */

export class AlgorithmRegistry {
  constructor() {
    this.strategies = new Map();
  }

  registerStrategy(algorithmId, strategyInstance) {
    if (!algorithmId || !strategyInstance) {
      throw new Error('Algorithm ID and Strategy instance are required');
    }
    this.strategies.set(algorithmId, strategyInstance);
  }

  getStrategy(algorithmId = 'rule-engine-v1') {
    const strategy = this.strategies.get(algorithmId);
    if (!strategy) {
      throw new Error(`Assignment algorithm strategy '${algorithmId}' not found`);
    }
    return strategy;
  }

  listStrategies() {
    return Array.from(this.strategies.keys());
  }
}

const algorithmRegistry = new AlgorithmRegistry();
export default algorithmRegistry;
