import app from './app.js';
import database from './database.js';
import email from './email.js';
import features from './features.js';
import security from './security.js';
import storage from './storage.js';

const config = {
  app,
  database,
  email,
  features,
  security,
  storage
};

export default config;
export { validateEnv } from './validateEnv.js';
export { app, database, email, features, security, storage };
