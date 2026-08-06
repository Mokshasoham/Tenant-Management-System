import fs from 'fs';
import path from 'path';
import { StorageProvider } from '../contracts/StorageProvider.js';
import logger from '../logging/logger.js';
import storageConfig from '../config/storage.js';
import { PLATFORM_VERSION } from '../version.js';

/**
 * Local Filesystem Storage Provider implementing the stable StorageProvider contract.
 */
class LocalStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.basePath = storageConfig.localPath;
  }

  async initialize() {
    logger.info('Initializing Local Filesystem Storage Provider...');
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
    return true;
  }

  async health() {
    const start = Date.now();
    try {
      fs.accessSync(this.basePath, fs.constants.W_OK);
      const latency = Date.now() - start;
      return {
        status: 'UP',
        latencyMs: latency,
        lastChecked: new Date().toISOString(),
        version: PLATFORM_VERSION,
        details: { basePath: this.basePath }
      };
    } catch (err) {
      logger.error('Storage health check failure:', err);
      return {
        status: 'DOWN',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        version: PLATFORM_VERSION,
        details: { error: err.message }
      };
    }
  }

  async shutdown() {
    logger.info('Shutting down Local Storage Provider...');
    return true;
  }

  async upload(fileBuffer, filename, mimeType, category) {
    const targetDir = path.join(this.basePath, category);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);
    await fs.promises.writeFile(filePath, fileBuffer);
    
    const virtualPath = `/uploads/${category}/${filename}`;
    logger.info(`File uploaded successfully to local disk: ${virtualPath}`);
    return {
      success: true,
      filename,
      category,
      filePath,
      url: virtualPath
    };
  }

  async delete(filename, category) {
    const filePath = path.join(this.basePath, category, filename);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.info(`File deleted successfully from local disk: ${filePath}`);
      return true;
    }
    logger.warn(`Attempted to delete file, but it was not found: ${filePath}`);
    return false;
  }

  async getSignedUrl(filename, ttlSeconds = 86400) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    return `/uploads/reports/${filename}?expires=${encodeURIComponent(expiresAt)}`;
  }
}

const storageProvider = new LocalStorageProvider();
export default storageProvider;
export { LocalStorageProvider };
