export class VideoKYCProvider {
  constructor() {
    this.providerName = 'abstract';
  }

  async createSession(verificationId, metadata = {}) {
    throw new Error('Method createSession() must be implemented by subclass');
  }

  async generateRoomToken(sessionId, userId, role) {
    throw new Error('Method generateRoomToken() must be implemented by subclass');
  }

  async evaluateSession(sessionId, agentInput = {}) {
    throw new Error('Method evaluateSession() must be implemented by subclass');
  }

  async checkProviderHealth() {
    throw new Error('Method checkProviderHealth() must be implemented by subclass');
  }
}

export default VideoKYCProvider;
