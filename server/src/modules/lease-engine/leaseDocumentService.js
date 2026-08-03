import mongoose from 'mongoose';
import Lease from '../../models/Lease.js';
import Property from '../../models/Property.js';
import Tenant from '../../models/Tenant.js';
import User from '../../models/User.js';
import FileMetadata from '../../models/FileMetadata.js';
import { uploadFileBuffer } from '../../services/fileService.js';
import { buildLeaseEngineInput } from './leaseDataMapper.js';
import { generateLeaseAgreement, computeSha256 } from './core/index.js';
import { renderOnePageLeaseBuffer } from '../../services/pdfService.js';
import logger from '../../utils/logger.js';

const TEMPLATE_VERSION = 'EnterpriseLease_v1.0';

/**
 * Public Orchestrator Service for Lease Document Engine
 */
export async function generateAndStoreLeasePDF({ leaseId, user, forceRegenerate = false, templateVersion = TEMPLATE_VERSION }) {
  const lease = await Lease.findById(leaseId)
    .populate({
      path: 'property',
      populate: { path: 'manager', select: 'firstName lastName email phone' },
    })
    .populate('tenant');

  if (!lease) {
    throw new Error(`Lease not found: ${leaseId}`);
  }

  // Idempotency Check: if active PDF already exists and no force flag, return existing
  if (!forceRegenerate) {
    const existingActiveDoc = await FileMetadata.findOne({
      relatedEntity: lease._id,
      category: 'leases',
      status: 'active',
    });

    if (existingActiveDoc) {
      logger.info(`[leaseDocumentService] Idempotency match: Active PDF already exists for lease ${lease.leaseNumber} (FileId: ${existingActiveDoc._id}). Skipping duplicate generation.`);
      return {
        fileId: existingActiveDoc._id,
        url: existingActiveDoc.url,
        sha256: existingActiveDoc.sha256,
        version: existingActiveDoc.documentVersion || 'v1.0',
        templateVersion: existingActiveDoc.templateVersion || TEMPLATE_VERSION,
        isExisting: true,
      };
    }
  }

  // Find tenant user details
  let tenantUser = null;
  if (lease.tenant && lease.tenant.email) {
    tenantUser = await User.findOne({ email: lease.tenant.email });
  }

  const managerUser = lease.property?.manager || null;

  // Determine revision version
  const existingDocsCount = await FileMetadata.countDocuments({ relatedEntity: lease._id, category: 'leases' });
  const revision = existingDocsCount + 1;
  const versionString = `v${revision}.0`;

  // Build raw input for Lease Document Engine
  const rawInput = await buildLeaseEngineInput(lease, tenantUser || lease.tenant, lease.property, managerUser, {
    documentVersion: revision,
    generatedBy: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'System (Auto)',
  });

  // Execute clean 1-page PDF rendering
  logger.info(`[leaseDocumentService] Generating official 1-page PDF for lease ${lease.leaseNumber} (${versionString})...`);
  const pdfBuffer = await renderOnePageLeaseBuffer({ 
    lease, 
    tenant: tenantUser || lease.tenant, 
    property: lease.property, 
    signature: lease.signature 
  });
  const sha256Hash = computeSha256(pdfBuffer);

  const filename = `lease_${lease.leaseNumber}_${versionString}.pdf`;

  // Mark previous active document metadata records as 'superseded' (never delete old versions)
  await FileMetadata.updateMany(
    { relatedEntity: lease._id, category: 'leases', status: 'active' },
    { $set: { status: 'superseded' } }
  );

  // Store file in FileStorage & FileMetadata
  const record = await uploadFileBuffer({
    buffer: pdfBuffer,
    filename,
    mimeType: 'application/pdf',
    category: 'leases',
    relatedEntityId: lease._id,
    relatedModelName: 'Lease',
  });

  // Attach metadata attributes to FileMetadata document
  record.sha256 = sha256Hash;
  record.documentVersion = versionString;
  record.templateVersion = templateVersion;
  record.status = 'active';
  if (user) record.uploader = user._id;
  await record.save();

  // Attach lightweight reference to lease.documents
  const hasExistingRef = lease.documents.some(d => d.fileId && d.fileId.toString() === record._id.toString());
  if (!hasExistingRef) {
    lease.documents.push({
      fileId: record._id,
      name: filename,
      url: record.url,
      uploadedAt: new Date(),
    });
  }
  lease.leaseVersion = revision;
  await lease.save();

  logger.info(`[leaseDocumentService] Successfully generated & stored Enterprise Lease PDF (FileId: ${record._id}, SHA256: ${sha256Hash.slice(0, 8)}...)`);

  return {
    fileId: record._id,
    url: record.url,
    sha256: sha256Hash,
    version: versionString,
    templateVersion,
    isExisting: false,
  };
}
