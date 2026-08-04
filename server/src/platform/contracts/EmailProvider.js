/**
 * Contract interface for Email providers.
 */
export class EmailProvider {
  async initialize() {
    throw new Error('initialize() not implemented.');
  }

  async health() {
    throw new Error('health() not implemented.');
  }

  async shutdown() {
    throw new Error('shutdown() not implemented.');
  }

  /**
   * Send email message
   * @param {object} options - to, subject, html, text, attachments
   */
  async sendEmail(options) {
    throw new Error('sendEmail() not implemented.');
  }
}
