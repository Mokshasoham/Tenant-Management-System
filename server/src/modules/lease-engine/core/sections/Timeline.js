import { theme } from '../theme/tokens.js';
import { drawStatusChip } from '../components/StatusChip.js';
export function renderTimeline(doc, model, _def) {
    const { marginLeft, contentWidth } = theme.layout;
    doc.font('Helvetica-Bold').fontSize(theme.typography.h1.size).fillColor(theme.colors.navy900).text('LEASE TIMELINE');
    doc.moveDown(0.8);
    const steps = model.data?.timeline || [
        { label: 'Booking', status: 'Approved', date: '—' },
        { label: 'Agreement Generated', status: 'Signed', date: '—' },
        { label: 'Move-In', status: 'Pending', date: '—' },
        { label: 'Lease Start', status: 'Pending', date: '—' },
        { label: 'Lease End', status: 'Pending', date: '—' },
    ];
    const stepW = contentWidth / steps.length;
    const y = doc.y + 10;
    steps.forEach((s, i) => {
        const x = marginLeft + i * stepW + stepW / 2;
        // Node
        doc.circle(x, y, 6).fill(s.status === 'Pending' ? theme.colors.slate200 : theme.colors.navy700);
        if (i < steps.length - 1) {
            doc.strokeColor(theme.colors.slate200).lineWidth(1.5)
                .moveTo(x + 8, y).lineTo(x + stepW - 8, y).stroke();
        }
        doc.font('Helvetica').fontSize(7).fillColor(theme.colors.slate700)
            .text(s.label, x - stepW / 2 + 4, y + 14, { width: stepW - 8, align: 'center' });
        drawStatusChip(doc, s.status, x - 28, y + 28, { size: 'sm' });
    });
    doc.y = y + 55;
}
