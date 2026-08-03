/**
 * Shared Theme Tokens — Document Design System A.12 + B.1
 * All documents inherit these. No document may define its own design tokens.
 */
export const colors = {
    navy900: '#0B1F33',
    navy700: '#16324F',
    slate700: '#334155',
    slate500: '#64748B',
    slate200: '#D9E2EC',
    slate100: '#ECF2F7',
    slate50: '#F8FAFC',
    white: '#FFFFFF',
    blueTint: '#EAF2FF',
    blueDeep: '#2563EB',
    green600: '#15803D',
    greenTint: '#EAFBF0',
    amber600: '#B45309',
    amberTint: '#FFF7E8',
    red600: '#B42318',
    redTint: '#FEF3F2',
    monoSlate: '#475569',
    gold: '#C8A96B',
    goldTint: '#F7EFD9',
};
/** Status chip palette (A.4) — not brand-themeable */
export const statusColors = {
    Draft: { bg: '#E4E7EC', text: '#3C4655', dot: '#6B7280' },
    Pending: { bg: '#FCF3E3', text: '#B7791F', dot: '#B7791F' },
    Issued: { bg: '#FCF3E3', text: '#B7791F', dot: '#B7791F' },
    Viewed: { bg: '#FCF3E3', text: '#B7791F', dot: '#B7791F' },
    Approved: { bg: '#E9F7EF', text: '#1F9254', dot: '#1F9254' },
    Signed: { bg: '#E9F7EF', text: '#1F9254', dot: '#1F9254' },
    Verified: { bg: '#E9F7EF', text: '#1F9254', dot: '#1F9254' },
    Expired: { bg: '#FBEAE8', text: '#C0392B', dot: '#C0392B' },
    Cancelled: { bg: '#FBEAE8', text: '#C0392B', dot: '#C0392B' },
    Archived: { bg: '#F1F3F5', text: '#6B7280', dot: '#6B7280', hollow: true },
    Superseded: { bg: '#F1F3F5', text: '#6B7280', dot: '#6B7280', hollow: true },
    Generated: { bg: '#EEF3FC', text: '#1E3A5F', dot: '#1E3A5F' },
};
export const typography = {
    fontFamily: 'Helvetica',
    fontFamilyMono: 'Courier',
    display: { size: 24, weight: 'bold' },
    h1: { size: 14, weight: 'bold' },
    h2: { size: 11, weight: 'bold' },
    h3: { size: 9, weight: 'bold' },
    body: { size: 8, weight: 'normal' },
    bodyStrong: { size: 9, weight: 'bold' },
    table: { size: 8, weight: 'normal' },
    mono: { size: 8, weight: 'normal' },
    caption: { size: 7, weight: 'normal' },
    footer: { size: 7, weight: 'normal' },
};
/** 8pt spacing grid */
export const spacing = {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
    7: 48,
    8: 64,
};
export const radii = {
    card: 12,
    chip: 999,
    sm: 3,
    md: 6,
};
export const layout = {
    pageWidth: 595.28, // A4 points
    pageHeight: 841.89,
    marginTop: 40,
    marginBottom: 40,
    marginLeft: 40,
    marginRight: 40,
    headerHeight: 30,
    footerHeight: 28,
    cardPadding: 12,
    tableCellPaddingV: 6,
    tableCellPaddingH: 8,
    dividerWeight: 0.5,
    qrMinSize: 70,
    contentWidth: 595.28 - 80,
};
export const theme = {
    colors,
    statusColors,
    typography,
    spacing,
    radii,
    layout,
};
export default theme;
