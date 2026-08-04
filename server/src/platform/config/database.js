export default {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }
};
