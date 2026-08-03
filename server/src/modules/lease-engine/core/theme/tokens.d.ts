/**
 * Shared Theme Tokens — Document Design System A.12 + B.1
 * All documents inherit these. No document may define its own design tokens.
 */
export declare const colors: {
    readonly navy900: "#0B1F33";
    readonly navy700: "#16324F";
    readonly slate700: "#334155";
    readonly slate500: "#64748B";
    readonly slate200: "#D9E2EC";
    readonly slate100: "#ECF2F7";
    readonly slate50: "#F8FAFC";
    readonly white: "#FFFFFF";
    readonly blueTint: "#EAF2FF";
    readonly blueDeep: "#2563EB";
    readonly green600: "#15803D";
    readonly greenTint: "#EAFBF0";
    readonly amber600: "#B45309";
    readonly amberTint: "#FFF7E8";
    readonly red600: "#B42318";
    readonly redTint: "#FEF3F2";
    readonly monoSlate: "#475569";
    readonly gold: "#C8A96B";
    readonly goldTint: "#F7EFD9";
};
/** Status chip palette (A.4) — not brand-themeable */
export declare const statusColors: Record<string, {
    bg: string;
    text: string;
    dot: string;
    hollow?: boolean;
}>;
export declare const typography: {
    readonly fontFamily: "Helvetica";
    readonly fontFamilyMono: "Courier";
    readonly display: {
        readonly size: 24;
        readonly weight: "bold";
    };
    readonly h1: {
        readonly size: 14;
        readonly weight: "bold";
    };
    readonly h2: {
        readonly size: 11;
        readonly weight: "bold";
    };
    readonly h3: {
        readonly size: 9;
        readonly weight: "bold";
    };
    readonly body: {
        readonly size: 8;
        readonly weight: "normal";
    };
    readonly bodyStrong: {
        readonly size: 9;
        readonly weight: "bold";
    };
    readonly table: {
        readonly size: 8;
        readonly weight: "normal";
    };
    readonly mono: {
        readonly size: 8;
        readonly weight: "normal";
    };
    readonly caption: {
        readonly size: 7;
        readonly weight: "normal";
    };
    readonly footer: {
        readonly size: 7;
        readonly weight: "normal";
    };
};
/** 8pt spacing grid */
export declare const spacing: {
    readonly 1: 4;
    readonly 2: 8;
    readonly 3: 12;
    readonly 4: 16;
    readonly 5: 24;
    readonly 6: 32;
    readonly 7: 48;
    readonly 8: 64;
};
export declare const radii: {
    readonly card: 12;
    readonly chip: 999;
    readonly sm: 3;
    readonly md: 6;
};
export declare const layout: {
    readonly pageWidth: 595.28;
    readonly pageHeight: 841.89;
    readonly marginTop: 40;
    readonly marginBottom: 40;
    readonly marginLeft: 40;
    readonly marginRight: 40;
    readonly headerHeight: 30;
    readonly footerHeight: 28;
    readonly cardPadding: 12;
    readonly tableCellPaddingV: 6;
    readonly tableCellPaddingH: 8;
    readonly dividerWeight: 0.5;
    readonly qrMinSize: 70;
    readonly contentWidth: number;
};
export declare const theme: {
    readonly colors: {
        readonly navy900: "#0B1F33";
        readonly navy700: "#16324F";
        readonly slate700: "#334155";
        readonly slate500: "#64748B";
        readonly slate200: "#D9E2EC";
        readonly slate100: "#ECF2F7";
        readonly slate50: "#F8FAFC";
        readonly white: "#FFFFFF";
        readonly blueTint: "#EAF2FF";
        readonly blueDeep: "#2563EB";
        readonly green600: "#15803D";
        readonly greenTint: "#EAFBF0";
        readonly amber600: "#B45309";
        readonly amberTint: "#FFF7E8";
        readonly red600: "#B42318";
        readonly redTint: "#FEF3F2";
        readonly monoSlate: "#475569";
        readonly gold: "#C8A96B";
        readonly goldTint: "#F7EFD9";
    };
    readonly statusColors: Record<string, {
        bg: string;
        text: string;
        dot: string;
        hollow?: boolean;
    }>;
    readonly typography: {
        readonly fontFamily: "Helvetica";
        readonly fontFamilyMono: "Courier";
        readonly display: {
            readonly size: 24;
            readonly weight: "bold";
        };
        readonly h1: {
            readonly size: 14;
            readonly weight: "bold";
        };
        readonly h2: {
            readonly size: 11;
            readonly weight: "bold";
        };
        readonly h3: {
            readonly size: 9;
            readonly weight: "bold";
        };
        readonly body: {
            readonly size: 8;
            readonly weight: "normal";
        };
        readonly bodyStrong: {
            readonly size: 9;
            readonly weight: "bold";
        };
        readonly table: {
            readonly size: 8;
            readonly weight: "normal";
        };
        readonly mono: {
            readonly size: 8;
            readonly weight: "normal";
        };
        readonly caption: {
            readonly size: 7;
            readonly weight: "normal";
        };
        readonly footer: {
            readonly size: 7;
            readonly weight: "normal";
        };
    };
    readonly spacing: {
        readonly 1: 4;
        readonly 2: 8;
        readonly 3: 12;
        readonly 4: 16;
        readonly 5: 24;
        readonly 6: 32;
        readonly 7: 48;
        readonly 8: 64;
    };
    readonly radii: {
        readonly card: 12;
        readonly chip: 999;
        readonly sm: 3;
        readonly md: 6;
    };
    readonly layout: {
        readonly pageWidth: 595.28;
        readonly pageHeight: 841.89;
        readonly marginTop: 40;
        readonly marginBottom: 40;
        readonly marginLeft: 40;
        readonly marginRight: 40;
        readonly headerHeight: 30;
        readonly footerHeight: 28;
        readonly cardPadding: 12;
        readonly tableCellPaddingV: 6;
        readonly tableCellPaddingH: 8;
        readonly dividerWeight: 0.5;
        readonly qrMinSize: 70;
        readonly contentWidth: number;
    };
};
export type Theme = typeof theme;
export default theme;
