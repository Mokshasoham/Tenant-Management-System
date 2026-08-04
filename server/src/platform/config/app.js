export default {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',
  logLevel: process.env.LOG_LEVEL || 'debug'
};
