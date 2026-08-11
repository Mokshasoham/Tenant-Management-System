export class FacialVerificationProvider {
  constructor() {
    this.providerName = 'abstract';
  }

  async verifyLivenessAndMatch(liveCaptureBuffer, referenceImageBuffer, metadata = {}) {
    throw new Error('Method verifyLivenessAndMatch() must be implemented by subclass');
  }

  async checkProviderHealth() {
    throw new Error('Method checkProviderHealth() must be implemented by subclass');
  }
}

export default FacialVerificationProvider;
