import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';

/** Footer is drawn by the shared renderer on every page. This export satisfies the section library. */
export function renderFooter(_doc: InstanceType<typeof PDFDocument>, _model: DocumentModel, _def: SectionDefinition): void {
  // no-op — footer is applied by SectionRenderer.drawFooter
}
