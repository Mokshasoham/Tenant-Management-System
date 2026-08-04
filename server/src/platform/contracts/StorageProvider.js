/**
 * Contract interface for File Storage providers.
 */
export class StorageProvider {
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
   * Upload file block
   * @param {Buffer} fileBuffer - Raw file buffer bytes
   * @param {string} filename - Unique filename
   * @param {string} mimeType - File MIME type context
   * @param {string} category - Destination category directory
   */
  async upload(fileBuffer, filename, mimeType, category) {
    throw new Error('upload() not implemented.');
  }

  /**
   * Delete file from storage
   * @param {string} filename - Filename key
   * @param {string} category - Directory category
   */
  async delete(filename, category) {
    throw new Error('delete() not implemented.');
  }
}
