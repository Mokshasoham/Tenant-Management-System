/**
 * Shared PDF Engine
 * Generic engine — Lease Agreement (and future types) only provide data + section order.
 * One engine for all document types.
 */

import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition, GeneratedDocument } from '../types';
import { theme } from '../theme/tokens';
import { computeSha256, createSecurityBlock, formatHashShort } from '../services/hash';
// Use require to avoid missing ambient types in some environments
const QRCode: any = require('qrcode');
import { SectionRenderer } from '../renderer/SectionRenderer';
import { DocumentRegistry } from '../registry/DocumentRegistry';

export interface EngineOptions {
  brandingOverride?: Partial<import('../types').BrandingConfig>;
}

export class SharedPDFEngine {
  private renderer: SectionRenderer;

  constructor() {
    this.renderer = new SectionRenderer();
  }

  /**
   * Generate a PDF for any registered document type.
   */
  async generate(
    type: import('../types').DocumentType,
    rawData: any,
    options: EngineOptions = {}
  ): Promise<GeneratedDocument> {
    const reg = DocumentRegistry.get(type);
    if (!reg) {
      throw new Error(`Document type "${type}" is not registered in DocumentRegistry`);
    }

    // 1. Map domain data → DocumentModel
    const model = reg.dataMapper(rawData);
    if (options.brandingOverride) {
      model.branding = { ...model.branding, ...options.brandingOverride };
    }

    // 2. Resolve sections (apply conditional rules A.10)
    const sections = reg.sectionOrder.filter((s) => {
      if (s.conditional) return s.conditional(model);
      return true;
    });

    // 3. Render to buffer
    // Pre-generate QR code image (data URL) for verification page (local generation)
    try {
      const verifyUrl = `https://verify.tenantmgmt.example/doc/${model.id.formatted}`;
      const dataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 400 });
      if (!model.security) model.security = {} as any;
      (model.security as any).qrData = dataUrl;
    } catch (err) {
      // If QR generation fails, continue without it
      console.warn('[SharedPDFEngine] QR generation failed', err);
    }

    const buffer = await this.renderToBuffer(model, sections);

    // 4. Hash & security
    const security = createSecurityBlock(buffer, model.branding.companyName);
    model.security = security;

    // Re-render is expensive; for production one would inject hash into a known page.
    // Here we attach metadata and return.

    return {
      id: model.id.formatted,
      type: model.type,
      buffer,
      hash: security.sha256Hash,
      lifecycle: model.lifecycle,
      version: model.version,
      generatedAt: model.generatedAt,
      pageCount: 0, // filled by render
      verificationUrl: `https://verify.tenantmgmt.example/doc/${model.id.formatted}`,
    };
  }

  private renderToBuffer(
    model: DocumentModel,
    sections: SectionDefinition[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: theme.layout.marginTop,
          bottom: theme.layout.marginBottom,
          left: theme.layout.marginLeft,
          right: theme.layout.marginRight,
        },
        autoFirstPage: true,
        bufferPages: true,
        info: {
          Title: `${model.type} ${model.id.formatted}`,
          Author: model.branding.companyName,
          Subject: model.metadata?.title || model.type,
          Creator: 'Tenant Management System Document Engine',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        this.renderer.renderDocument(doc, model, sections);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const pdfEngine = new SharedPDFEngine();
export default SharedPDFEngine;
