import { theme } from '../theme/tokens.js';
export function renderCards(doc, model, def) {
    const { marginLeft, contentWidth } = theme.layout;
    const titles = {
        Tenant: 'TENANT INFORMATION',
        Property: 'PROPERTY INFORMATION',
        Emergency: 'EMERGENCY INFORMATION',
        AmendmentLog: 'AMENDMENT LOG',
    };
    const title = titles[def.id] || def.id.toUpperCase();
    doc.font('Helvetica-Bold').fontSize(theme.typography.h1.size).fillColor(theme.colors.navy900).text(title);
    doc.moveDown(0.6);
    if (def.id === 'AmendmentLog') {
        if (!model.data?.amendments?.length) {
            doc.roundedRect(marginLeft, doc.y, contentWidth, 40, 6)
                .fill(theme.colors.slate50).strokeColor(theme.colors.slate200).lineWidth(0.5).stroke();
            doc.font('Helvetica').fontSize(9).fillColor(theme.colors.slate500)
                .text('None recorded', marginLeft + 14, doc.y + 14);
            doc.y += 50;
        }
        else {
            model.data.amendments.forEach((a) => {
                doc.font('Helvetica').fontSize(9).fillColor(theme.colors.slate700)
                    .text(`${a.number}: ${a.summary} (effective ${a.effectiveDate})`);
                doc.moveDown(0.3);
            });
        }
        return;
    }
    const data = def.id === 'Tenant' ? model.data?.tenant :
        def.id === 'Property' ? model.data?.property :
            def.id === 'Emergency' ? model.data?.emergency : null;
    if (data && typeof data === 'object') {
        Object.entries(data).forEach(([k, v]) => {
            if (typeof v === 'object')
                return;
            doc.font('Helvetica').fontSize(8).fillColor(theme.colors.slate500).text(k, marginLeft, doc.y, { width: 140, continued: true });
            doc.font('Helvetica-Bold').fillColor(theme.colors.slate700).text(String(v));
            doc.moveDown(0.3);
        });
    }
    else {
        doc.font('Helvetica').fontSize(9).fillColor(theme.colors.slate500).text('No data bound for this section.');
    }
    doc.moveDown();
}
