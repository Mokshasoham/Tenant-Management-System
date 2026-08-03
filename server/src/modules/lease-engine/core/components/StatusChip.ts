/**
 * Standard Status Chip (A.4)
 * One component, one palette, used everywhere.
 */

import PDFDocument from 'pdfkit';
import { theme, statusColors } from '../theme/tokens';

type Doc = InstanceType<typeof PDFDocument>;

export function drawStatusChip(
  doc: Doc,
  label: string,
  x: number,
  y: number,
  options: { size?: 'sm' | 'md' } = {}
): number {
  const palette = statusColors[label] || statusColors.Draft;
  const padX = options.size === 'sm' ? 6 : 8;
  const padY = options.size === 'sm' ? 2 : 3;
  const fontSize = options.size === 'sm' ? 7 : 8;

  doc.fontSize(fontSize).font('Helvetica-Bold');
  const textW = doc.widthOfString(label);
  const w = textW + padX * 2 + 10;
  const h = fontSize + padY * 2;

  // Background pill
  doc
    .roundedRect(x, y, w, h, h / 2)
    .fill(palette.bg);

  // Dot
  const dotR = 2.5;
  doc
    .circle(x + padX + 2, y + h / 2, dotR)
    .fill(palette.dot);

  // Label
  doc
    .fillColor(palette.text)
    .text(label, x + padX + 8, y + padY, {
      width: textW + 4,
      lineBreak: false,
    });

  return w;
}
