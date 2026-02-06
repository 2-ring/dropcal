/**
 * Spacing and sizing system for DropCal mobile app
 * Extracted from frontend/src/App.css CSS variables
 *
 * All values in pixels for React Native
 * rem conversions assume 1rem = 16px
 */

export const spacing = {
  // Button sizes
  buttonSmall: 48,
  buttonMedium: 48,
  buttonLarge: 64,

  // Icon sizes
  iconSmall: 24,
  iconMedium: 24,
  iconLarge: 32,

  // Brand/Logo
  brandMarkSize: 32,
  brandLogoGap: 8, // calculated from var(--brand-mark-size) * 0.25

  // Gap/Padding (1rem = 16px, 1.5rem = 24px)
  dropAreaGap: 24, // 1.5rem
  dropAreaGapMobile: 16, // 1rem on mobile

  // Dock padding
  dockPaddingVertical: 8, // 0.5rem
  dockPaddingHorizontal: 16, // 1rem

  // Text sizes
  textSize: 16, // 1rem

  // Common spacing scale
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,

  // Content padding
  contentPaddingVertical: 32, // 2rem
  contentPaddingHorizontal: 16, // 1rem

  // Container max widths
  maxWidthDropArea: 700,
  maxWidthEvents: 800,
  maxWidthSoundInput: 600,

  // Border radius
  radiusSmall: 8,
  radiusMedium: 12,
  radiusLarge: 16,
  radiusXLarge: 64, // drop area
  radiusXLargeMobile: 56, // drop area mobile
  radiusRound: 9999, // circular buttons

  // Sidebar
  sidebarWidth: 280,

  // Dock height (from EventsWorkspace.css)
  dockHeight: 56,
  dockHeightMobile: 50,
} as const;

export type Spacing = typeof spacing;
