/** Enterprise Document Engine */
import { DocumentRegistry } from './registry/DocumentRegistry.js';
import { SharedPDFEngine, pdfEngine } from './engine/SharedPDFEngine.js';
import { registerLeaseAgreement } from './documents/lease/register.js';
import { generateDocumentId, parseDocumentId } from './services/documentId.js';
import { computeSha256, verifyDocumentHash, formatHashShort } from './services/hash.js';
import { theme } from './theme/tokens.js';
registerLeaseAgreement();
export { DocumentRegistry, SharedPDFEngine, pdfEngine, generateDocumentId, parseDocumentId, computeSha256, verifyDocumentHash, formatHashShort, theme, };
export async function generateLeaseAgreement(rawData, options) {
    return pdfEngine.generate('LEASE', rawData, options);
}
const _defaultExport = {
    DocumentRegistry,
    pdfEngine,
    generateLeaseAgreement,
    theme,
};
export default _defaultExport;
