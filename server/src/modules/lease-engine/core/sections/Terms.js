import { theme } from '../theme/tokens.js';
export function renderTerms(doc, model, _def) {
    doc.font('Helvetica-Bold').fontSize(theme.typography.h1.size).fillColor(theme.colors.navy900).text('TERMS & CONDITIONS');
    doc.moveDown(0.6);
    const clauses = model.data?.terms || [
        'The Tenant agrees to pay the monthly rent on or before the due date specified in this Agreement.',
        'The Security Deposit shall be refundable subject to deductions for damages beyond normal wear and tear.',
        'The Tenant shall not sublet the Premises without prior written consent of the Landlord.',
        'Either party may terminate this Agreement by giving 30 days written notice.',
        'The Tenant is responsible for utility charges as specified in the Financial Information section.',
    ];
    clauses.forEach((c, i) => {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(theme.colors.navy700).text(`${i + 1}.`, { continued: true });
        doc.font('Helvetica').fillColor(theme.colors.slate700).text(`  ${c}`);
        doc.moveDown(0.5);
    });
}
