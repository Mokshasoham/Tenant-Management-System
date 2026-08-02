import mongoose from 'mongoose';
import { ALLOWED_FILE_CATEGORIES } from '../constants/fileCategories.js';

const FileMetadataSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
    },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    relatedEntity: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    relatedModel: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      enum: ALLOWED_FILE_CATEGORIES,
      required: true,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
    sha256: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

FileMetadataSchema.index({ key: 1 });
FileMetadataSchema.index({ uploader: 1 });
FileMetadataSchema.index({ relatedEntity: 1, relatedModel: 1 });
FileMetadataSchema.index({ sha256: 1, uploader: 1, category: 1 });

export default mongoose.model('FileMetadata', FileMetadataSchema);
