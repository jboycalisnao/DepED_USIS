/**
 * DepED USIS Web-Kit Design System Tokens
 * Aligned with deped-web-kit, AGENTS.md, and official DepEd visual guidelines.
 */

export const THEME = {
  colors: {
    // Official DepEd Institutional Tri-Color Palette
    depedBlue: '#0038a8',      // Official DepEd Blue / Primary brand
    depedRed: '#ce1126',       // Official DepEd Red / National flag red
    depedYellow: '#fdb913',    // Official DepEd Gold / Sunshine yellow
    depedDarkBlue: '#002060',  // Deep Institutional Navy

    // Standard Semantic Aliases
    primary: '#0038a8',
    primaryDark: '#002060',
    primaryLight: '#e6edf8',
    accentRed: '#ce1126',
    accentYellow: '#fdb913',

    // Surfaces & Canvas
    canvas: '#f5f8fc',         // Light institutional background
    background: '#f5f8fc',
    surface: '#ffffff',        // Card & modal background
    surfaceAlt: '#fbfcff',     // Input & secondary container surface
    surfaceHover: '#f1f5f9',

    // Borders & Lines
    line: '#d8e2ee',           // Standard USIS 1px boundary line
    border: '#d8e2ee',
    lineSubtle: '#e8eef5',
    lineDivider: '#c7ccd6',    // Header vertical divider
    borderFocus: '#0038a8',

    // Typography & Ink
    ink: '#12233d',            // DepEd primary text ink
    textPrimary: '#12233d',
    inkSecondary: '#4b5e78',   // Secondary descriptive text
    textSecondary: '#4b5e78',
    inkMuted: '#8a8a8a',       // Utility labels & placeholders
    textMuted: '#8a8a8a',
    inkInverse: '#ffffff',
    textInverse: '#ffffff',

    // Status Signals
    success: '#16a34a',
    successLight: '#dcfce7',
    successBorder: '#86efac',
    warning: '#d97706',
    warningLight: '#fef3c7',
    warningBorder: '#fde68a',
    danger: '#ce1126',
    dangerLight: '#fee2e2',
    dangerBorder: '#fca5a5',
    info: '#0284c7',
    infoLight: '#e0f2fe',
    infoBorder: '#bae6fd',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    hero: 32,
  },

  radius: {
    sm: 6,
    md: 8,
    box: 12, // Strict 12px box treatment per AGENTS.md
    full: 9999,
  },

  shadows: {
    card: {
      shadowColor: '#12233d',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    loginCard: {
      shadowColor: '#12233d',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 4,
    },
    modal: {
      shadowColor: '#12233d',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 8,
    },
  },

  typography: {
    fontFamily: 'System',
    sizes: {
      titleMax: 24,    // Maximum allowed title size per AGENTS.md
      title: 20,
      subheading: 16,  // Maximum allowed regular body text per AGENTS.md
      body: 14,
      caption: 13,     // Maximum allowed subtitle / helper / label size per AGENTS.md
      tag: 11,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,    // Maximum allowed font weight per AGENTS.md
    },
  },
};
