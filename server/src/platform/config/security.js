export default {
  jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production_12345',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  cookieSecret: process.env.COOKIE_SECRET || 'cookie_signing_secret_918255'
};
