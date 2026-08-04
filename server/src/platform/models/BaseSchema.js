import mongoose from 'mongoose';

/**
 * Reusable Base Schema fields for SaaS multi-tenancy and auditing.
 * Mixed into business models to ensure data structure consistency.
 * 
 * @param {mongoose.Schema} schema - Mongoose Schema to inject fields into
 */
export const addBaseFields = (schema) => {
  schema.add({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    businessUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessUnit', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
  });

  // Optimize multi-tenant database searches
  schema.index({ organizationId: 1 });
  schema.index({ isDeleted: 1 });
};
