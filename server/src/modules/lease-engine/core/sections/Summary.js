/**
 * Summary Section — Agreement Summary + Approval Summary cards
 */
import { theme } from '../theme/tokens.js';
import { drawStatusChip } from '../components/StatusChip.js';
export function renderSummary(doc, model, def) {
    if (def.id === 'ApprovalSummary') {
        renderApprovalSummary(doc, model);
        return;
    }
    renderAgreementSummary(doc, model);
}
function renderAgreementSummary(doc, model) {
    const { marginLeft, contentWidth } = theme.layout;
    const d = model.data || {};
    doc
        .font('Helvetica-Bold')
        .fontSize(theme.typography.h1.size)
        .fillColor(theme.colors.navy900)
        .text('AGREEMENT SUMMARY');
    doc.moveDown(0.8);
    const cards = [
        { label: 'Tenant', value: d.tenant?.name || '—' },
        { label: 'Property', value: d.property?.name || d.property?.address || '—' },
        { label: 'Manager', value: d.manager?.name || '—' },
        { label: 'Duration', value: d.duration || '—' },
        { label: 'Monthly Rent', value: d.financial?.monthlyRent || '—', emphasize: true },
        { label: 'Security Deposit', value: d.financial?.deposit || '—' },
        { label: 'Start Date', value: d.startDate || '—' },
        { label: 'End Date', value: d.endDate || '—' },
    ];
    const cols = 4;
    const gap = 8;
    const cardW = (contentWidth - gap * (cols - 1)) / cols;
    const cardH = 48;
    let startY = doc.y;
    cards.forEach((c, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = marginLeft + col * (cardW + gap);
        const y = startY + row * (cardH + gap);
        doc
            .roundedRect(x, y, cardW, cardH, 9)
            .fill(c.emphasize ? theme.colors.blueTint : theme.colors.white)
            .strokeColor(theme.colors.slate200)
            .lineWidth(0.7)
            .stroke();
        if (c.emphasize) {
            doc
                .roundedRect(x + 4, y + 4, cardW - 8, 6, 3)
                .fill(theme.colors.blueDeep)
                .fill();
        }
        doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(theme.colors.slate500)
            .text(c.label.toUpperCase(), x + 10, y + 8, { width: cardW - 20 });
        doc
            .font('Helvetica-Bold')
            .fontSize(c.emphasize ? 11 : 9)
            .fillColor(c.emphasize ? theme.colors.navy900 : theme.colors.slate700)
            .text(String(c.value), x + 10, y + 22, { width: cardW - 20 });
    });
    doc.y = startY + Math.ceil(cards.length / cols) * (cardH + gap) + 6;
}
function renderApprovalSummary(doc, model) {
    const { marginLeft, contentWidth } = theme.layout;
    const steps = model.data?.approvalSteps || [
        { label: 'Booking Approved', status: 'Approved', at: '—' },
        { label: 'Manager Approved', status: 'Approved', at: '—' },
        { label: 'Payment Completed', status: 'Approved', at: '—' },
        { label: 'Lease Created', status: 'Approved', at: '—' },
        { label: 'Agreement Generated', status: 'Signed', at: '—' },
    ];
    doc
        .font('Helvetica-Bold')
        .fontSize(theme.typography.h1.size)
        .fillColor(theme.colors.navy900)
        .text('APPROVAL SUMMARY');
    doc.moveDown(0.6);
    const cardY = doc.y;
    const rowH = 22;
    const cardH = steps.length * rowH + 16;
    doc
        .roundedRect(marginLeft, cardY, contentWidth, cardH, 10)
        .fill(theme.colors.white)
        .strokeColor(theme.colors.slate200)
        .lineWidth(0.8)
        .stroke();
    let y = cardY + 10;
    steps.forEach((s) => {
        doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(theme.colors.slate700)
            .text(s.label, marginLeft + 14, y, { width: 180 });
        drawStatusChip(doc, s.status || 'Pending', marginLeft + 200, y - 1, {
            size: 'sm',
        });
        doc
            .font('Courier')
            .fontSize(7)
            .fillColor(theme.colors.monoSlate)
            .text(s.at || '', marginLeft + 300, y, { width: 180 });
        y += rowH;
    });
    doc.y = cardY + cardH + 12;
}
