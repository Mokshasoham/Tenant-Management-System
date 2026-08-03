/**
 * Attachment Manifest (A.6)
 * Always visible. Empty categories show "Not attached".
 */
import { theme } from '../theme/tokens.js';
export function renderAttachments(doc, model, _def) {
    const { marginLeft, contentWidth } = theme.layout;
    doc
        .font('Helvetica-Bold')
        .fontSize(theme.typography.h1.size)
        .fillColor(theme.colors.navy900)
        .text('ATTACHMENTS');
    doc.moveDown(0.6);
    const items = model.attachments?.length
        ? model.attachments
        : [
            { label: 'Property Images', count: 0, types: ['JPG'], attached: false },
            { label: 'Inventory Checklist', count: 0, types: ['PDF'], attached: false },
            { label: 'KYC Verification', count: 0, types: ['PDF', 'JPG'], attached: false },
            { label: 'Inspection Report', count: 0, types: ['PDF'], attached: false },
            { label: 'Payment Receipt', count: 0, types: ['PDF'], attached: false },
            { label: 'Government IDs', count: 0, types: ['PDF'], attached: false },
            { label: 'Signed Addendums', count: 0, types: [], attached: false },
        ];
    const rowH = 18;
    const cardY = doc.y;
    const cardH = items.length * rowH + 16;
    doc
        .roundedRect(marginLeft, cardY, contentWidth, cardH, 6)
        .fill(theme.colors.white)
        .strokeColor(theme.colors.slate200)
        .lineWidth(0.5)
        .stroke();
    let y = cardY + 10;
    items.forEach((item) => {
        const glyph = item.attached ? '✔' : '○';
        const color = item.attached ? theme.colors.green600 : theme.colors.slate500;
        doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(color)
            .text(glyph, marginLeft + 12, y, { width: 16 });
        doc
            .fillColor(theme.colors.slate700)
            .text(item.label, marginLeft + 32, y, { width: 200 });
        const right = item.attached && item.count > 0
            ? `${item.count} file${item.count > 1 ? 's' : ''} (${item.types.join(', ')})`
            : 'Not attached';
        doc
            .font(item.attached ? 'Courier' : 'Helvetica')
            .fontSize(8)
            .fillColor(theme.colors.monoSlate)
            .text(right, marginLeft + 240, y, {
            width: contentWidth - 260,
            align: 'right',
        });
        y += rowH;
    });
    doc.y = cardY + cardH + 10;
}
