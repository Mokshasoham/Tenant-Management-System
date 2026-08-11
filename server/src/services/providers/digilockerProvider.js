export class DigiLockerProvider {
  constructor() {
    this.providerName = 'abstract';
  }

  getAuthorizationUrl(state) {
    throw new Error('Method getAuthorizationUrl(state) must be implemented by subclass');
  }

  async exchangeToken(code, state) {
    throw new Error('Method exchangeToken(code, state) must be implemented by subclass');
  }

  async getUserProfile(accessToken) {
    throw new Error('Method getUserProfile(accessToken) must be implemented by subclass');
  }

  async listDocuments(accessToken) {
    throw new Error('Method listDocuments(accessToken) must be implemented by subclass');
  }

  async getDocument(accessToken, providerDocumentId) {
    throw new Error('Method getDocument(accessToken, providerDocumentId) must be implemented by subclass');
  }

  async revokeAccess(accessToken) {
    throw new Error('Method revokeAccess(accessToken) must be implemented by subclass');
  }
}

export default DigiLockerProvider;
