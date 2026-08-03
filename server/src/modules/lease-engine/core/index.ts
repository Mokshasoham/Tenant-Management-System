/** Enterprise Document Engine */
import { DocumentRegistry } from './registry/DocumentRegistry';
import { SharedPDFEngine, pdfEngine } from './engine/SharedPDFEngine';
import { registerLeaseAgreement } from './documents/lease/register';
import { generateDocumentId, parseDocumentId } from './services/documentId';
import { computeSha256, verifyDocumentHash, formatHashShort } from './services/hash';
import { theme } from './theme/tokens';

registerLeaseAgreement();

export {
  DocumentRegistry,
  SharedPDFEngine,
  pdfEngine,
  generateDocumentId,
  parseDocumentId,
  computeSha256,
  verifyDocumentHash,
  formatHashShort,
  theme,
};

export async function generateLeaseAgreement(rawData: any, options?: any) {
  return pdfEngine.generate('LEASE', rawData, options);
}

const _defaultExport: any = {
  DocumentRegistry,
  pdfEngine,
  generateLeaseAgreement,
  theme,
};

export default _defaultExport;

