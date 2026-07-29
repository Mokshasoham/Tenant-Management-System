import mongoose from 'mongoose';

const FileStorageSchema = new mongoose.Schema({
  filename: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  mimeType: { 
    type: String, 
    required: true 
  },
  data: { 
    type: Buffer, 
    required: true 
  }
}, { timestamps: true });

export default mongoose.model('FileStorage', FileStorageSchema);
